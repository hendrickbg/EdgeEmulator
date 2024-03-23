const axios = require('axios')
const fs = require('fs');
const { ethers } = require('ethers');
const { exec } = require('child_process');

const API_URL = process.env.API_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CATALOG_CONTRACT_ADDRESS = process.env.CATALOG_CONTRACT_ADDRESS;

const catalogContractJson = require("./artifacts/contracts/Catalog.sol/Catalog.json");
const farmMenuContractAbi = require("./artifacts/contracts/Catalog.sol/FarmMenu.json");

const abi = catalogContractJson.abi;

const provider = new ethers.providers.JsonRpcProvider(API_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const catalogContract = new ethers.Contract(CATALOG_CONTRACT_ADDRESS, abi, signer);

const REQUESTED_DEVICE_ID = '1';

let FARM_ID = "";

async function createKeyFile(base64Key, filePath) {
    // Decode the base64 key
    const keyBuffer = Buffer.from(base64Key, 'base64');
  
    // Write the key buffer to the file
    try {
      await fs.promises.writeFile(filePath, keyBuffer);
      console.log(`Key file created: ${filePath}`);
    } catch (error) {
      console.error('Error creating key file:', error);
    }
}

async function checkIPNSKeyNameExists(ipfs, keyName) {
    console.log("Checking if IPNS key exists...");
    try {
      const keys = await ipfs.key.list();
      const keyExists = await keys.some((key) => key.name === keyName);
  
      return keyExists;
    } catch (error) {
      // An error occurred while retrieving the keys, which indicates
      // that the key does not exist.
      return false;
    }
}

async function getContainerName() {
    const containerName = process.env.CONTAINER_NAME;
    console.log("Container name: ", containerName);
  
    const parts = containerName.split('node');
    const nodeNumber = parseInt(parts[1]);
    const farmId = isNaN(nodeNumber) ? 'unknown' : nodeNumber.toString();
    console.log("Farm ID: ", farmId);
    return farmId;
}

async function catIpfsGateway(cid) {
  try {
    const response = await axios.get(`https://ipfs.io/ipfs/${cid}`);
    //console.log(response.data);
    return response.data;
  } catch (error) {
    return "";
  }
}

async function catIpfs(ipfs, cid) {
  var data = '';
  var metadata_chunks;
  var contentString = '';
  
  var errorFlag = false;

  while(true) {
    try { 

      if(errorFlag == false) {
        console.log("Fetching content from CID: ", cid);
      
        data = ipfs.cat(cid, { timeout: 15*1000});
        metadata_chunks = []
        for await (const chunk of data) {
            metadata_chunks.push(chunk)
        }
        contentString = Buffer.concat(metadata_chunks).toString();

        return contentString;

      } else {
        console.log("Trying to fetch IPFS data from gateway...");

        //ipfsCid.replace('/ipfs/', ''
        if(cid.includes("/ipfs/")) {
          contentString = await catIpfsGateway(cid.replace('/ipfs/', ''));
        } else {
          contentString = await catIpfsGateway(cid);
        }
        
        if(contentString == "") {
          errorFlag = false;
          console.log("Error trying to fetch IPFS data again...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

        } else {
          return contentString;
        }
      }
      
    } catch(error) {
      //console.log("Error: ",  error);
      console.log("Error trying to fetch IPFS data again...");
      errorFlag = true;
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

async function importKey(keyName, keyFile) {
    return new Promise((resolve, reject) => {
      const command = `ipfs key import ${keyName} ./${keyFile}.key`;
  
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(`Error executing command: ${error.message}`);
          return;
        }
  
        if (stderr) {
          reject(`Command error: ${stderr}`);
          return;
        }
  
        const importedKey = stdout.trim();
        
        resolve(importedKey);
      });
    });
}

async function exportKey(keyName) {
    return new Promise((resolve, reject) => {
      const command = `ipfs key export ${keyName} -o exportedKey.key`;
  
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(`Error executing command: ${error.message}`);
          return;
        }
  
        if (stderr) {
          reject(`Command error: ${stderr}`);
          return;
        }
  
        const exportedKey = stdout.trim();
        resolve(exportedKey);
      });
    });
}

async function importFarmMenuIpnsKeyName(ipfs) {
    console.log("Importing FarmMenuSecretKey...");

    let secretKeyCid = "";

    while(true) {
        secretKeyCid = await catalogContract.farmMenuListSecretKey(); 
        
        if(secretKeyCid != "") {
            console.log("Secret key CID: ", secretKeyCid);
            break;
        } else {
            console.log("Error reading secret key from Polygon Catalog");
            console.log("Trying again...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    
    
    // const exportedKey = Buffer.concat(metadata_chunks).toString()
    const exportedKey = await catIpfs(ipfs, secretKeyCid);
    // const exportedKey = await catIpfsGateway(secretKeyCid);
    console.log("Key exported: ", exportedKey);
  
    FARM_ID = await getContainerName();

    const clone = "FarmMenuListSecretKey_Farm" + FARM_ID;
    console.log("Checking if key exist ...");
    const keyExists = await checkIPNSKeyNameExists(ipfs, clone);
  
    if(keyExists == false) {
      //const key = await ipfs.key.import(clone, exportedKey, '123456');
      const keyFile = clone;
      console.log("Creating key file: ", keyFile);
      await createKeyFile(exportedKey, `${keyFile}.key`);
      console.log("Importing key...");
      const key = await importKey(clone, keyFile);
  
      console.log("\nKey imported: ", key);
      return key;
    }
  
    return clone;
}

async function main() {
    let { create } = await import('ipfs-http-client');
    let ipfs = await create({ url: 'http://127.0.0.1:5001' });
    let farmList = [];
    let farmDictionary = {};
    let cid = "";

    //waits 5 minutos to properly initialize the system
    await new Promise((resolve) => setTimeout(resolve, 1000*60*2));

    await importFarmMenuIpnsKeyName(ipfs);

    //While there is no farm registered in the system
    while(farmList.length == 0) {
        //Waits 5 minutes before start requesting data. It is done to wait for the system intialize procedure.
        //await new Promise((resolve) => setTimeout(resolve, 1000*60*5));


        while(true) {
            const result = await catalogContract.farmMenuListIpnsKey();
            console.log("Request result: ", result);

            for await (const name of ipfs.name.resolve(`/ipns/${result}`)) {
                cid = name;
            }
            
            if(cid) {
                console.log("CID Resolved: ", cid);
                break;
            } else {
                console.log(`Error resolving ${result}, trying again...`);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
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
    const farmID = await getContainerName();
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
                
                // Ensure the directory exists, create it if it doesn't
                const outputPath = "/Results";
                fs.mkdirSync(outputPath, { recursive: true }); 

                // File path
                const filePath = path.join(outputPath, `farm${FARM_ID}_request_node${deviceID}.txt`);

                const csvData = `${n};${elapsedTimeSeconds};${average}\n`;
                fs.appendFile("/app/Results/request_results.txt", csvData, (err) => {
                    if (err) throw err;
                    console.log('Data appended to the CSV file.');
                });
                
                previousCid = outputCid;

                await new Promise((resolve) => setTimeout(resolve, 1000*60*2));
            }
    
        } catch(error) {
            console.log("Error: ", error);
            console.log("Running again...");
        }
        
    }
}

main();
