const fs = require('fs');
const { ethers } = require('ethers');

const API_URL = process.env.API_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CATALOG_CONTRACT_ADDRESS = process.env.CATALOG_CONTRACT_ADDRESS;

const catalogContractJson = require("./artifacts/contracts/Catalog.sol/Catalog.json");
const farmMenuContractAbi = require("./artifacts/contracts/Catalog.sol/FarmMenu.json");

const abi = catalogContractJson.abi;

const provider = new ethers.providers.JsonRpcProvider(API_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const catalogContract = new ethers.Contract(CATALOG_CONTRACT_ADDRESS, abi, signer);

const REQUESTED_DEVICE_ID = '0';

async function catIpfs(ipfs, cid) {
    var data = '';
    var metadata_chunks;
    var contentString = '';
    
    while(true) {
      try { 
        console.log("Fetching content from CID: ", cid);
        
        data = ipfs.cat(cid);
        metadata_chunks = []
        for await (const chunk of data) {
            metadata_chunks.push(chunk)
        }
        contentString = Buffer.concat(metadata_chunks).toString();
  
        return contentString;
      } catch(error) {
        console.log("Error: ",  error);
        console.log("Error trying to fetch IPFS data again...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
}
  
async function getRandomFarm(farmList) {
    // Get a random index within the range of the farmList length
    const randomIndex = Math.floor(Math.random() * farmList.length);
    // Return the element at the random index
    return farmList[randomIndex];
}

async function main() {
    let { create } = await import('ipfs-http-client');
    let ipfs = await create({ url: 'http://127.0.0.1:5001' });
    let farmList = [];
    let farmDictionary = {};

    //waits 10 minutos to properly initialize the system
    await new Promise((resolve) => setTimeout(resolve, 1000*60*10));

    //While there is no farm registered in the system
    while(farmList.length == 0) {
        //Waits 5 minutes before start requesting data. It is done to wait for the system intialize procedure.
        //await new Promise((resolve) => setTimeout(resolve, 1000*60*5));

        const result = await catalogContract.farmMenuListIpnsKey();
        console.log("Request result: ", result);

        for await (const name of ipfs.name.resolve(`/ipns/${result}`)) {
            cid = name;
        }
        
        console.log("CID: ", cid.replace('/ipfs/', ''));
        var contentString = "";

        while(contentString != "-1;-1;-1;-1;-1;-1") {
            contentString = await catIpfs(ipfs, cid);
            console.log("IPFS output: ", contentString);
        
            const ipfsContentList = contentString.split(';');
            
            if(contentString != "-1;-1;-1;-1;-1;-1") {
                //list of all currently available
                farmList.push(ipfsContentList[0]);
                
                //stores the smart contract address in the dictionary, with the farmID as the key
                farmDictionary[ipfsContentList[0]] = ipfsContentList[1];
            
                console.log("FarmDictionary: ", farmDictionary);
                console.log("FarmList: ", farmList);

                if (ipfsContentList.length > 1) { 
                    cid = ipfsContentList[2];
                }
            }
        }

    }

    //select the farm which it will interate with randomly
    const farmID = await getRandomFarm(farmList);
    console.log("FarmID: ", farmID);
    farmSc = farmDictionary[farmID];

    console.log("Farm SC: ", farmSc)
    let farmMenuContract = new ethers.Contract(farmSc, farmMenuContractAbi.abi, signer);
    let outputIpns = await farmMenuContract.outputIpnsPk();

    let ipnsName = '/ipns/' + outputIpns;
    let previousCid;
    let outputCid;

    //initialize all values that will be used to generate the graph results
    let n = 0;
    let totalElapsedTime = 7840035.508;
    let bestTime = 10000000000;
    let worstTime = 0;

    console.log("IPNS Name: ", ipnsName);

    while(true) {
        
        try {
            for await (const name of ipfs.name.resolve(ipnsName)) {
                previousCid = name;
            }
    
            outputCid = previousCid;
    
            const device_requested = REQUESTED_DEVICE_ID;
            
            const startTime = process.hrtime();
    
            while(true) {
    
                const tx = await farmMenuContract.requestDeviceData(device_requested);
                const receipt = await tx.wait();
                console.log("Transaction done!");
    
                console.log("Previous CID: ", previousCid);
                console.log("Output CID: ", outputCid);
    
    
                let timeoutReached = false;
                const timeoutDuration = 5*60000; // Timeout duration in milliseconds (5*60 seconds)

                // Start a timeout timer
                const timeoutTimer = setTimeout(() => {
                    timeoutReached = true;
                }, timeoutDuration);

                // Run the loop until either the condition is met or the timeout is reached
                while ((outputCid == previousCid) && !timeoutReached) {
                    for await (const name of ipfs.name.resolve(ipnsName)) {
                        outputCid = name;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
                }

                // Clear the timeout timer
                clearTimeout(timeoutTimer);

                // Check if the loop ended due to timeout
                if (timeoutReached) {
                    console.log('Timeout reached while waiting for outputCid to change.');
                    continue; // Go back to the top of the while loop
                } else {
                    console.log('outputCid has changed.');
                }
    
                const endTime = process.hrtime(startTime);
                const elapsedTime = endTime[0]*1000+endTime[1]/1000000;
    
                totalElapsedTime += elapsedTime;
                n += 1;
    
                const average = (totalElapsedTime/n)/1000;
    
                console.log("\n\nDevice data: ", outputCid);
                const deviceMetadata = await catIpfs(ipfs, outputCid);
                console.log("Device Metadata: ", deviceMetadata);
    
                const metadataList = deviceMetadata.split(';');
                const nextCid = metadataList[1];
                console.log("Reading from CID: ", nextCid);
                const deviceLastData = await catIpfs(ipfs, nextCid);
                console.log("Device last data: ", deviceLastData);
    
                const deviceLastDataList = deviceLastData.split(';');

                const elapsedTimeSeconds = elapsedTime/1000;
                if(elapsedTimeSeconds < bestTime) {
                    bestTime = elapsedTimeSeconds;
                }
    
                if(elapsedTimeSeconds > worstTime) {
                    worstTime = elapsedTimeSeconds;
                }
    
                console.log("Elapsed Time: ", elapsedTimeSeconds);
                console.log("Total elapse time: ", totalElapsedTime);
                console.log(`[${n}]: Worst Time: ${worstTime} --- Best Time: ${bestTime}`);
                console.log(`[${n}]: Avarange time: ${average}\n\n`);

                const csvData = `${n};${elapsedTimeSeconds};${average}\n`;
                fs.appendFile("/app/Results/request_results.txt", csvData, (err) => {
                    if (err) throw err;
                    console.log('Data appended to the CSV file.');
                });
                
                previousCid = outputCid;

                await new Promise((resolve) => setTimeout(resolve, 1000*60*7));
            }
    
        } catch(error) {
            console.log("Error: ", error);
            console.log("Running again...");
        }
        
    }
}

main();
