# aws-sap-idoc-tricks

One of my favorite parts of the old "Late Show with David Letterman" was when he occasionally hosted a segment called ["Stupid Pet Tricks"](https://www.youtube.com/watch?v=RAVSaYZSWv8).  The premise was that pet owners of all kinds would travel to New York with their pets and showcase tricks in front of a national late night audience.  Most of the time, Dave would react in his typical deadpan manner to whatever ridiculous performance the guest and their pet could pull off--and hilarity would ensue.

Now, there's a saying that goes "you can't teach an old dog new tricks", and in the world of Enterprise Applicaiton Integrations, the lowly IDOC is certainly an Old Dog.  For decades, SAP's Intermediate Document or IDOC has been a mainstay of messaging integrations patterns.  It's durable, simple, widely supported and proven.  The IDOC processing framework on SAP is some of the oldest and most mature code in the entire application.

What I will show you here is how to connect SAP's IDOC interface with various AWS services to perhaps get some new tricks out of the "Old Dog".

## Objectives
- Use standard SAP IDOC functionality using config only--no ABAP code, user exits, BADI's, smoke and mirrors, etc.
- Must be able to return an acknowledgement back to the SAP system confirming the IDOC got to where it was going
- Has to be serverless on the AWS side!
- Has to scale and be highly available

## The Steps

1. Configure an AWS API Gateway as an endpoint for the IDOC
2. Setup SSL trust for AWS API Gateway
3. Enable SNI support for SAP server
4. Configure outbound SAP RFC destination 
5. Configure outbound IDOC for RFC destination
6. Write Lamdba routine to process IDOC
7. Upon processing, trigger ALEAUD IDOC back to SAP

## 1. Setup an API Gateway endpoint

In my first experiments, I was determined to spool IDOCs straight to AWS SQS.  This worked ok, but I ran into a limitation.  I found in testing that SAP will connect to an HTTP endpoint and spool a whole batch of IDOCs rather than sending the messages one by one.

I think this is actually a good design in that I really wouldn't want to create and close a connection for each and every message...rather I'd like to batch those messages.  And this exactly what the default behavior is of the HTTP-XML RFC destination.

But this creates a problem in that AWS SQS only supports a maximum message size via the REST API of 256K.  I was reaching that maximum after only a couple MATMAS05 IDOCs and SQS was truncating the rest of the XML stream.

So, we have to go some other route.  Additionally, because I want to use the standard HTTP XML stream format out of SAP as-is, I don't have much flexibility in configuring headers, content-type or inserting query string params.  What we need is a layer of abstraction where we can map that default message to pretty much anything that we'd need to make any AWS API call.  AWS API Gateway can do that!  It can proxy for just about every AWS service as well as being able to hand off to AWS Lambda for unlimited possiblities.

If you find yourself in a situation where you don't have control over the format of the inbound message, then an API Gateway gives you some flexibility.

However, because API Gateway uses CloudFront as its backend, this does introduce a really sneaky problem into the mix, but we talk about that in step 2.

## 2. Setup SSL Trust for SAP RFC Destination

Out of the box, SAP comes with a few SSL certificates which allow the server to connect to a limited collection of hosts via HTTPS.  As luck would have it, the SSL certificates that SAP ships with don't include those used by the AWS API endpoints.  So, we have to create a SSL Trust and import those certs.


## 3. Enable SNI Support for SAP server

*HEADS-UP...I guess I spend a good three days trying to uncover this little nugget of info that you're about to read.*

Originally, I knew I wanted to use the API Gateway for reasons mentioned above.  I tried and tried to get it to work, but kept getting back cryptic messages when I would test the connection (Step 3).  I could connect to other AWS API destinations just fine, but the API Gateway just didn't want to work.  I turned on all sorts of ICM logging and scrutinized those logs for any key.  I googled relentlessly, searched both SAP Community Network (SCN) forums and AWS Forums--no luck.

**As an aside:  In my searching, I found plenty of people who deeply understood SAP's perspective on SSL and there were tons of people who knew the AWS world, but it was extremely frustrating that noone seemed to be "bilingual" in both worlds.   This is the sole mission of the AWS Practice at Applexus--to grow a community that can maximize the value at the intersection of the SAP world and the AWS world!**

The answer I seemed to always resolve to was I needed to register my own SSL cert from a provider (as API Gateway does not work with self-signed certs as of this writing).  I was almost ready to admit defeat and drop a few hundred on a wildcard cert when I remembered something...(if only AWS Certificate Manager was integrated with API Gateway!)

API Gateway is different from the other AWS API endpoints in that it uses CloudFront as a backend.  I also recalled the two options we have for SSL client support--use SNI or drop $600/month for a dedicated IP at each edge location.  I wondered if SAP supported SNI.  Well, guess what...it does--sort of.

Starting with Kernel 7.41+, there is a parameter which controls whether SAP (acting as an SSL client) supports SNI.  **By default, it is set to FALSE.**  We need to enable this parameter and I bet we could then connect with API Gateway without dropping a few hundred on a custom SSL cert.  See OSS note xxxx.




## 3. Setup HTTP RFC Destination