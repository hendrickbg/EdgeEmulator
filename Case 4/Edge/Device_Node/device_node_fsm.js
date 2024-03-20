const axios = require('axios')
const FormData = require('form-data')
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path'); // Add the path module
const { exec } = require('child_process');
const moment = require('moment');
const Web3 = require('web3');
const os = require('os');

////////////////////////////////////////PUBLIC POLYGON CODE//////////////////////////////////////////////////////

const API_URL = process.env.API_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CATALOG_CONTRACT_ADDRESS = process.env.CATALOG_CONTRACT_ADDRESS;

const catalogContractJson = require("./artifacts/contracts/Catalog.sol/Catalog.json");
const farmMenuContractAbi = require("./artifacts/contracts/Catalog.sol/FarmMenu.json");
const { log } = require('console');

const abi = catalogContractJson.abi;

const provider = new ethers.providers.JsonRpcProvider(API_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const catalogContract = new ethers.Contract(CATALOG_CONTRACT_ADDRESS, abi, signer);

var count = 0;

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI3MTMxZTcwNi03N2ZlLTQ0MDctYWE5OC0xNDg4OTE2OGVkMTMiLCJlbWFpbCI6ImhlbmRyaWNrLmdvbmNhbHZlc0BlZHUucHVjcnMuYnIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNmI4OWNhZmU2NmQ3ZWNkYTQ1OTMiLCJzY29wZWRLZXlTZWNyZXQiOiJkYzFiM2I1NTdjNTVjYmJhNDRjZTQ5N2I3Y2NiNTNlMzQ1ODdmN2Y5MThjMmU3NzViZDI1MmQ2MjAyMTEwNDU4IiwiaWF0IjoxNzAwMDcxMjQ2fQ.dyLJcWzw9dcs7tEYu24q7QPZQ35eKphJgkDHPl3x5fA'
var fileContent = "";
var cnt = 0;
const fileName = 'ipfs_file.txt';

var nodeIpnsKey = "";
let FARM_ID = "";
var farmOutputIpnsPk = "";
let farmSc = "";
let farmMenuContract;

////////////////////////////////////////PRIVATE ETHEREUM CODE/////////////////////////////////////////////////////

const privateProvider = new ethers.providers.JsonRpcProvider("http://172.16.5.1:8545");

// Read contract bytecode from file
const contractHex = fs.readFileSync('contractHex.txt', 'utf8');
const privContractAbi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"catalogIpnsKey","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getCatalogIpnsKey","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getOutputIpnsKey","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getOutputIpnsPrivateKey","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPrivateKeyCid","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"outputIpnsKey","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"outputIpnsPrivateKey","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"privateKeyCid","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_caralog_ipns_key","type":"string"}],"name":"setCatalogIpnsKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_output_ipns_key","type":"string"}],"name":"setOuputIpnsKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_output_ipns_private_key","type":"string"}],"name":"setOutputIpnsPrivateKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_sk_cid","type":"string"}],"name":"setPrivateKeyCid","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const contractInterface = new ethers.ContractFactory(privContractAbi, contractHex, privateProvider.getSigner());
let gtwCatalogContract;

let gtwContractAddress;

const web3 = new Web3('http://172.16.5.1:8545');

// Function to scan recent blocks for contract creation transactions
async function getLastScAddress() {
  try {
      let latestBlockNumber = await web3.eth.getBlockNumber();

      while (true) {
          const block = await web3.eth.getBlock(latestBlockNumber, true);

          if (!block) {
              console.error("Error: Failed to retrieve block", latestBlockNumber);
              await sleep(5000); // Retry after a delay
              continue;
          }

          if (block.transactions && block.transactions.length > 0) {
              for (const tx of block.transactions) {
                  const txReceipt = await web3.eth.getTransactionReceipt(tx.hash);

                  if (txReceipt && txReceipt.contractAddress && web3.utils.isAddress(txReceipt.contractAddress)) {
                      console.log("Contract address discovered:", txReceipt.contractAddress);
                      return txReceipt.contractAddress;
                  }
              }
          }

          await sleep(1000); // Retry after a short delay
          latestBlockNumber++;
      }
  } catch (error) {
      console.error("Error scanning for contract deployment:", error);
      return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForNetworkReady(ipfs) {
  var readyFlag = "0";
  
  while (readyFlag === "0") {
    readyFlag = await farmMenuContract.ready();
    if (readyFlag === "0") {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function deployContract() {
  try {
      // Deploy the contract
      gtwCatalogContract = await contractInterface.deploy();
      
      // Contract deployed successfully, you can access its address and other details
      console.log('Contract deployed at address:', gtwCatalogContract.address);
      return gtwCatalogContract.address;
  } catch (error) {
      console.error('Error deploying contract:', error);
      return null;
  }
}

async function getGtwScAddress() {
  
  while(true) {
    const addr = await farmMenuContract.gtwScAddr(); 
    if(addr) {
      return addr;
    } else {
      console.log("Waiting for Gtw SC being deployed...");
      await publishToIpns(ipfs, ipfs_cid, farmIpnsKey, 1000);
    }
  }
}

async function generateGtwCatalogInstance() {
  gtwContractAddress = await getGtwScAddress();
  console.log("Gtw Sc Addr: ", gtwContractAddress);
  
  gtwCatalogContract = await new web3.eth.Contract(privContractAbi, gtwContractAddress);
}

async function importCatalogIpnsKeyName(ipfs) {
  
  console.log("Importing Catalog IPNS key...");
  const privateKeyCid = await gtwCatalogContract.methods.privateKeyCid().call(); 

  const exportedKey = await catIpfs(ipfs, privateKeyCid);
  console.log("IPFS output: ", exportedKey);

  var fileName = path.basename(__filename);
  fileName = fileName.replace(".js", "");

  const clone = "IpnsSecretKey";
  const keyFile = clone;

  await createKeyFile(exportedKey, `${keyFile}.key`);
  const key = await importKey(clone, keyFile);

  console.log("\nCatalog Key imported: ", key);
}

async function importOutputIpnsKeyName(ipfs) {

  console.log("Importing Output IPNS key...");

  const outputIpnsPrivateKey = await gtwCatalogContract.methods.outputIpnsPrivateKey().call(); 
  console.log("Ouput IPNS CID: ", outputIpnsPrivateKey);

  const exportedKey = await catIpfs(ipfs, outputIpnsPrivateKey);
  console.log("IPFS output: ", exportedKey);

  var fileName = path.basename(__filename);
  fileName = fileName.replace(".js", "");

  const clone = "PrivateOutputIpnsKey";
  const keyFile = clone;

  await createKeyFile(exportedKey, `${keyFile}.key`);
  const key = await importKey(clone, keyFile);

  console.log("\nOutput Key imported: ", key);
}

async function checkPrivateCatalog(ipfs) {
  
  await importCatalogIpnsKeyName(ipfs);
  await importOutputIpnsKeyName(ipfs);

  outputIpnsKey = await gtwCatalogContract.methods.outputIpnsKey().call();
  console.log("OutputIpnsKey: ", outputIpnsKey);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////PUBLIC POLYGON CODE//////////////////////////////////////////////////////

function readFileAndDecode(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(`Error reading file: ${err}`);
        return;
      }

      // Convert file contents to a human-readable format
      const decodedData = data.toString('base64');

      resolve(decodedData);
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

const writeToFile = (filePath, content) => {
  return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, (err) => {
          if (err) {
              reject(err);
          } else {
              resolve();
          }
      });
  });
};

async function updaIpfsList(hash) {
  const currentTimestamp = moment().format('YYYY-MM-DD HH:mm:ss:SSS');
  const metadata = currentTimestamp + ';' + hash;
  
  console.log("Metadata that will be transmitted: ", metadata);
  const ipfs_cid = await addIpfsFile(metadata);
  await ipfsAddLocal(ipfs, metadata); //replicate to accelerate the ipns publish
  
  return (ipfs_cid);
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

// async function catIpfs(ipfs, cid) {
//   const data = ipfs.cat(cid);
//   const metadata_chunks = []
//   for await (const chunk of data) {
//       metadata_chunks.push(chunk)
//   }
//   const contentString = Buffer.concat(metadata_chunks).toString()
  
//   return (contentString);
// }

async function generateNodeIpnsKey(ipfs, deviceID) {
  var keyExists = false;
  var key = "";

  nodeIpnsKey = "Farm" + FARM_ID + '_' + "Device" + deviceID + "IpnsKey"; //ipns key name
  console.log("nodeIpnsKey: ", nodeIpnsKey);

  keyExists = await checkIPNSKeyNameExists(ipfs, nodeIpnsKey);
  console.log("Debug keyExists: ", keyExists);

  if(keyExists == false) {
    console.log(`Generating a new IPNS key for ${deviceID}...`);
    key = await ipfs.key.gen(nodeIpnsKey, { type: 'rsa', size: 2048 });
  } else{
    const keys = await ipfs.key.list();
    key = await keys.find((k) => k.name === nodeIpnsKey);
  }

  var ipfs_cid = await addIpfsFile("-1;-1;-1;-1;-1;-1");
  await ipfsAddLocal(ipfs, "-1;-1;-1;-1;-1;-1"); //replicate to accelerate the ipns publish

  console.log("IPFS CID: ", ipfs_cid);

  //populate its dataset IPNS key
  await publishToIpns(ipfs, ipfs_cid, nodeIpnsKey, 1000*30); //15s of timeout

  //publishes its dataset IPNS key to catalog IPNS key
  const catalogIpnsKey = await gtwCatalogContract.methods.catalogIpnsKey().call(); 
  const ipnsName = '/ipns/' + catalogIpnsKey;
  let ipfsCid;

  console.log("IPNS Name: ", ipnsName);
  for await (const name of ipfs.name.resolve(ipnsName)) {
    ipfsCid = name;
  }

  console.log("ipfsCID: ", ipfsCid);

  const metadata = deviceID + ';' + key.id + ';' + ipfsCid.replace('/ipfs/', '');
  console.log(`Storing DEVICE${deviceID} key: `, metadata);

  ipfs_cid = await addIpfsFile(metadata);
  await ipfsAddLocal(ipfs, metadata); //replicate to accelerate the ipns publish

  console.log("fileAdded: ", ipfs_cid);

  //no caso do gateway, ele ja tem a chave, se nao teria que importar
  //const catalogIpnsKeyName = await importCatalogIpnsKeyName(ipfs);
  await publishToIpns(ipfs, ipfs_cid, "IpnsSecretKey", 5000); 
}

async function checkDatasetIpns(ipfs, deviceID) {
  const catalogIpnsKey = await gtwCatalogContract.methods.catalogIpnsKey().call(); 
  console.log("CatalogIpnsKey: ", catalogIpnsKey);
  
  let cid;
  console.log("\n");

  for await (const name of ipfs.name.resolve(`/ipns/${catalogIpnsKey}`)) {
    cid = name;
  }

  console.log("CID: ", cid.replace('/ipfs/', ''));

  var contentString = "";

  // verify if this device already has its own ipns key
  while(contentString != "-1;-1;-1;-1;-1;-1") {
    contentString = await catIpfs(ipfs, cid);
    console.log("IPFS output: ", contentString);

    const ipfsContentList = contentString.split(';');

    //check of this device already has its own IPNS key
    if(ipfsContentList[0] == deviceID) {
      console.log("This device already has its IPNS key!");
      return true;
    }

    cid = ipfsContentList[2];

  }

  console.log("There is no IPNS key for this device!");

  return false;
}

async function getLastIpfsCid(ipfs, deviceID) {
  const catalogIpnsKey = await gtwCatalogContract.methods.catalogIpnsKey().call(); 
  console.log("CatalogIpnsKey: ", catalogIpnsKey);

  let cid;
  for await (const name of ipfs.name.resolve(`/ipns/${catalogIpnsKey}`)) {
    cid = name;
  }

  console.log("CatalogIpnsKey: ", catalogIpnsKey)
  console.log("CID: ", cid.replace('/ipfs/', ''));

  var contentString = "";

  console.log("Searching for deviceID: ", deviceID);
  while(contentString != "-1;-1;-1;-1;-1;-1") {
    contentString = await catIpfs(ipfs, cid);
    console.log("IPFS output: ", contentString);

    const ipfsContentList = contentString.split(';');

    //check of this device already has its own IPNS key
    if(ipfsContentList[0] == deviceID) {
      console.log("This device already has its IPNS key!");
      
      const ipnsPk = ipfsContentList[1];
      let cidTmp;
      for await (const name of ipfs.name.resolve(`/ipns/${ipnsPk}`)) {
        cidTmp = name;
      }
      //console.log()
      return (cidTmp.replace('/ipfs/', ''));
    }

    cid = ipfsContentList[2];

  }

  return "";
}

async function publishToIpns(ipfs, cid, keyName, timeout_ms) {
  // Create a promise that resolves after the specified timeout
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({ timeout: true });
    }, timeout_ms);
  });

  while(true) {
    try { 
      console.log("\nPublishing cid: ", cid);
      console.log("To: ", keyName);
      
      // Race between the ipfs.name.publish function and the timeout promise
      const result = await Promise.race([
        ipfs.name.publish(cid, { key: keyName }),
        timeoutPromise
      ]);

      // Check if the result indicates a timeout
      if (result && result.timeout) {
        throw new Error('Publishing to IPNS timed out');
      }
      
      console.log("Published to Catalog IPNS result: ", result);
      break;
    } catch(error) {
      console.log("Error: ",  error);
      console.log("Error publishing to IPNS! Trying again...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

// async function publishToIpns(ipfs, cid, keyName, timeout_ms) {

//   //const options = { key: keyName }; 

//   while(true) {
//     try { 
//       //console.log(`Publishing [${cid}] to ${keyName}`);
//       console.log("\nPublishing cid: ", cid);
//       console.log("To: ", keyName);
//       const result = await ipfs.name.publish(cid, { key: keyName }, {timeout: timeout_ms});
//       console.log("Published to Catalog IPNS result: ", result);
//       break;

//     } catch(error) {
//       console.log("Error: ",  error);
//       console.log("Error publishing to IPNS! Trying again...");
//       await new Promise((resolve) => setTimeout(resolve, 3000));
//     }
//   }
// }

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

async function ipfsAddLocal(ipfs, fileContent) {
  const fileAdded = await ipfs.add({
    path: "ipfs_file.txt",
    content: fileContent
  });

  console.log("IPFS Local Added: ", fileAdded.cid.toString());

  return fileAdded.cid.toString();
}

async function addIpfsFile(fileContent) {
  const formData = new FormData();
  const filePath = path.join(__dirname, fileName);

  console.log('Adding file to IPFS...');

  await writeToFile(filePath, fileContent);
  cnt += 1;
  
  const fileStream = fs.createReadStream(filePath);

  formData.append('file', fileStream);
  const pinataMetadata = JSON.stringify({ name: 'ipfs_file' });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({ cidVersion: 0 });
  formData.append('pinataOptions', pinataOptions);

    try {
      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
          headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${JWT}`,
          },
      });

      console.log(response.data);

      return response.data.IpfsHash;

  } catch (error) {
      console.error('Error pinning file to IPFS:', error);
  }
}

async function checkIPNSKeyNameExists(ipfs, keyName) {
  console.log("Checking if IPNS key exists...");
  try {
    const keys = await ipfs.key.list();
    const keyExists = keys.some((key) => key.name === keyName);

    return keyExists;
  } catch (error) {
    // An error occurred while retrieving the keys, which indicates
    // that the key does not exist.
    return false;
  }
}

async function publishToIpns(ipfs, cid, keyName, timeout_ms) {

  while(true) {
    try { 
      console.log("\nPublishing cid: ", cid);
      console.log("To: ", keyName);
      const result = await ipfs.name.publish(cid, { key: keyName });
      console.log("Published to Catalog IPNS result: ", result);
      break;

    } catch(error) {
      console.log("Error: ",  error);
      console.log("Error publishing to IPNS! Trying again...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function waitForAddressEvent() {
  const eventName = 'FarmCreated';

  console.log('Waiting for SC Address event...');

  return new Promise((resolve, reject) => {
    catalogContract.on(eventName, (farmScAddr) => {
      catalogContract.removeAllListeners(eventName); // Remove the event listener after the event is detected
      resolve(farmScAddr);
    });
  });
}

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

async function importFarmMenuIpnsKeyName(ipfs) {

  let secretKeyCid = "";

  while(true) {
    secretKeyCid = await catalogContract.farmMenuListSecretKey(); 

    //check if is not empty
    if(secretKeyCid.trim().length > 1) {
      console.log("Secret key CID: ", secretKeyCid);
      break;
    } else {
      console.log("Error reading FarmMenuList from Public Catalog. Trying again...");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // const exportedKey = Buffer.concat(metadata_chunks).toString()
  const exportedKey = await catIpfs(ipfs, secretKeyCid);
  // const exportedKey = await catIpfsGateway(secretKeyCid);
  console.log("Key exported: ", exportedKey);

  const clone = "FarmMenuListSecretKey_Farm" + FARM_ID;
  console.log("Checking if key exist ...");
  keyExists = await checkIPNSKeyNameExists(ipfs, clone);

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

async function checkFarmIpnsKey(ipfs, farmMenuListIpnsKey) {
  let cid;

  //cid = await getLastIpnsData(ipfs.name.resolve(`/ipns/${farmMenuListIpnsKey}`));
  for await (const name of ipfs.name.resolve(`/ipns/${farmMenuListIpnsKey}`)) {
    cid = name;
  }
  console.log("CID: ", cid.replace('/ipfs/', ''));

  var contentString = "";

  //verifica se a farm já possui um IPNS key para ela
  while(contentString != "-1;-1;-1;-1;-1;-1") {
    const data = ipfs.cat(cid);
    const metadata_chunks = []
    for await (const chunk of data) {
        metadata_chunks.push(chunk)
    }
    contentString = Buffer.concat(metadata_chunks).toString()
    console.log("IPFS output: ", contentString);

    const ipfsContentList = contentString.split(';');

    //check of this device already has its own IPNS key
    if(ipfsContentList[0] == FARM_ID) {
      console.log("This FARM already has its IPNS key!");
      
      //stores the FarmMenu SC to the respective variable
      farmSc = ipfsContentList[1];
      return true;
    }

    cid = ipfsContentList[2];
  }

  console.log("This FARM doesnt have its IPNS key!");

  return false
}

async function generateFarmIpnsKey(ipfs) {
  var keyExists = false;
  var key = "";

  var farmIpnsKey = "Farm" + FARM_ID + 'IpnsKey'; //ipns key name para estar farm
  console.log("FarmIpnsKey: ", farmIpnsKey);

  keyExists = await checkIPNSKeyNameExists(ipfs, farmIpnsKey);
  if(keyExists == false) {
    console.log(`Generating a new IPNS key for FARM${FARM_ID}...`);
    key = await ipfs.key.gen(farmIpnsKey, { type: 'rsa', size: 2048 });
    
    console.log("Generated key: ", key);
    console.log("Key ID: ", key.id);
  } else{
    const keys = await ipfs.key.list();
    key = await keys.find((k) => k.name === farmIpnsKey);
  }

  const ipfs_cid = await addIpfsFile("-1;-1;-1;-1;-1;-1");
  await ipfsAddLocal(ipfs, "-1;-1;-1;-1;-1;-1"); //replicate to accelerate the ipns publish

  //populate this IPNS key
  await publishToIpns(ipfs, ipfs_cid, farmIpnsKey, 1000*30); //15s of timeout

  return key.id; //retorna o ID da chave onde vai ser enviado o conteúdo dessa farm
}

async function checkPublicCatalog(ipfs) {
  var farmMenuListIpnsKey = await catalogContract.farmMenuListIpnsKey(); //verifica se a lista de farms nao existe
  console.log("FarmMenuListIpnsKey: ", farmMenuListIpnsKey);

  try {
    if(farmMenuListIpnsKey == '') { //se nao existe
      
      const catalogKeyName = 'PublicFarmMenuList'; //ipns key name para onde a lista de farms será armazenada

      var key = "";
      const keyExists = await checkIPNSKeyNameExists(ipfs, catalogKeyName);

      if(keyExists == false) {
        console.log("Generating a new IPNS public key for CSC...");
        key = await ipfs.key.gen(catalogKeyName, { type: 'rsa', size: 2048 }); //gera a chave
      } else{
        console.log("IPNS Key Already Exist!");
        const keys = await ipfs.key.list();
        key = await keys.find((k) => k.name === catalogKeyName); //procura a chave, caso ela exista
      }
    
      var ipfs_cid = await addIpfsFile("-1;-1;-1;-1;-1;-1");
      await ipfsAddLocal(ipfs, "-1;-1;-1;-1;-1;-1"); //replicate to accelerate the ipns publish
    
      //populate this IPNS key with a first value
      await publishToIpns(ipfs, ipfs_cid, catalogKeyName, 1000*30); //15s of timeout

      farmMenuListIpnsKey = key.id;

      console.log(`Sending key ${catalogKeyName} key to Catalog SC: ${key.id}`);
      var tx = await catalogContract.setFarmMenuListIpnsKey(key.id); //manda a chave gerada para o SC
      await tx.wait();
      console.log("Transaction done!");
      
      await exportKey(catalogKeyName);
      const tmpPath = 'exportedKey.key';
      const exportedKey = await readFileAndDecode(tmpPath);

      ipfs_cid = await addIpfsFile(exportedKey);
      await ipfsAddLocal(ipfs, exportedKey); //replicate to accelerate the ipns publish

      tx = await catalogContract.setFarmMenuListSecretKey(ipfs_cid); //armazena chave privada no SC
      await tx.wait();
      console.log("Transaction done!");
      
    }
  } catch(error) {
    console.log("Error catched: ", error);
    //console.log("Catalog Key Name already exist!");
  }

  //verifica se esta farm existe na lista de farms disponivel
  const farmExist = await checkFarmIpnsKey(ipfs, farmMenuListIpnsKey);
  if(!farmExist) {
    farmOutputIpnsPk = await generateFarmIpnsKey(ipfs);

    ////////////////////////////////////////////////
    console.log("Creating Farm Smart Contract...");
    await catalogContract.createFarm(FARM_ID, farmOutputIpnsPk); //gera o seu SC e salve a chave IPNS onde os dados requisitados desta fazenda serao enviados

    farmSc = await waitForAddressEvent();
    console.log("Farm SC: ", farmSc);

    //////////////////////////////////////
    const ipnsName = '/ipns/' + farmMenuListIpnsKey;
    let ipfsCid;

    //busca pelo ultimo elemento da fila
    console.log("IpnsName: ", ipnsName);
    for await (const name of ipfs.name.resolve(ipnsName)) {
      ipfsCid = name;
    }

    const metadata = FARM_ID + ';' + farmSc + ';' + ipfsCid.replace('/ipfs/', '');
    console.log(`Storing FARM${FARM_ID} key: `, metadata);
    ipfs_cid = await addIpfsFile(metadata);
    await ipfsAddLocal(ipfs, metadata); //replicate to accelerate the ipns publish

    console.log("CID1: ", ipfs_cid);
    //importa a chave para poder alterar o seu conteudo
    const farmMenuListIpnsKeyName = await importFarmMenuIpnsKeyName(ipfs);
    //publica esta chave IPNS gerada na lista de chaves do Catalog SC
    await publishToIpns(ipfs, ipfs_cid, farmMenuListIpnsKeyName, 5000); 
  
  } 
  
  //APENAS PARA TESTE, TIRAR ISSO DEPOIS
  if(farmSc == "") {
    // farmSc = "0x2D951a5F279D97ac7Ec246f6beeed2d603833fD3";
    console.log("ERROR! FARMSC DOES NOT HAVE ANY ADDRESS!");
  }

  console.log("My Farm SC: ", farmSc);
  farmMenuContract = new ethers.Contract(farmSc, farmMenuContractAbi.abi, signer);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function getFarmId() {
  const farmIdStr = process.env.FARM_ID;
  const parts = farmIdStr.split('farm_');
  
  const nodeNumber = parseInt(parts[1]);
  const farmId = isNaN(nodeNumber) ? 'unknown' : nodeNumber.toString();
  console.log("FARM ID Detected: ", farmId);
  return farmId;
}

async function getContainerName() {
  const containerName = process.env.CONTAINER_NAME;
  console.log("Container name: ", containerName);

  const parts = containerName.split('node');
  const nodeNumber = parseInt(parts[1]);
  const deviceID = isNaN(nodeNumber) ? 'unknown' : nodeNumber.toString();
  console.log("Device ID: ", deviceID);
  return deviceID;
}

async function getSensorData() {
  const deviceID = await getContainerName();
  const temperature = Math.floor(Math.random() * 31); // Random integer between 0 and 30
  const humidity = Math.floor(Math.random() * 21) + 40; // Random integer between 40 and 60
  const latitude = (Math.random() * 180) - 90;
  const longitude = (Math.random() * 360) - 180;
  const light = Math.floor(Math.random() * 301); // Random integer between 0 and 300

  const metadata = `${deviceID};${temperature};${humidity};${light};${latitude}, ${longitude}`;

  return metadata;
}

function waitForEvents() {
  return new Promise((resolve, reject) => {
    const event1 = "DataDeviceRequested";
    const event2 = "FarmDataRequested";
    const event3 = "IpnsUpdated";
    let resolved = false;

    const event1Listener = (deviceId) => {
      if (!resolved) {
        resolved = true;
        let info = {
          deviceID: deviceId,
          eventName: event1,
        };
        resolve(info);
      }
    };

    const event2Listener = () => {
      if (!resolved) {
        resolved = true;
        let info = {
          eventName: event2,
        };
        resolve(info);
      }
    };

    const event3Listener = (outputIpnsPk) => {
      if (!resolved) {
        resolved = true;
        let info = {
          ipnsPk: outputIpnsPk,
          eventName: event2,
        };
        resolve(info);
      }
    };

    // Cleanup event listeners
    const cleanupListeners = () => {
      farmMenuContract.removeListener(event1, event1Listener);
      farmMenuContract.removeListener(event2, event2Listener);
      farmMenuContract.removeListener(event3, event3Listener);
    };

    // Handle errors
    const errorHandler = (error) => {
      cleanupListeners();
      reject(error);
    };

    // Register event listeners
    farmMenuContract.on(event1, event1Listener);
    farmMenuContract.on(event2, event2Listener);
    farmMenuContract.on(event3, event3Listener);
    farmMenuContract.on("error", errorHandler);
  });
}

async function getFarmMenuAddr(ipfs) {

    let farmMenuAddr = "";
    let result = "";
    let import_flag = false;

    while(true) {
      result = await catalogContract.farmMenuListIpnsKey();
      console.log("FarmMenuList Result: ", result); 

      if(result != "") {
        break;
      } else {
        console.log("None FarmMenuList detect, trying again...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }


    let cid;
    // let resolved = false;

    while(farmMenuAddr == "") {

      
      while(true) {

        console.log("Resolving again with IPNS KEY: ", result);
        for await (const name of ipfs.name.resolve(`/ipns/${result}`)) {
          cid = name;
          console.log("CID RESOLVED DEBUG: ", cid);
        }

        if(cid) {
          console.log("CID Resolved From FarmMenuList: ", cid);
          break;
        } else {
          console.log("Error resolving FarmMenuList...");
          
          if(!import_flag) {
            console.log("Trying to import Farm Menu List Private Key...");
            import_flag = true;
            await importFarmMenuIpnsKeyName(ipfs);
          
          } else {
            console.log("Trying to resolve again...");
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log("Currently CID: ", cid.replace('/ipfs/', ''));
      var contentString = "";

      while(contentString != "-1;-1;-1;-1;-1;-1") {
          contentString = await catIpfs(ipfs, cid);
          console.log("IPFS output: ", contentString);
      
          const ipfsContentList = contentString.split(';');
          
          if(contentString != "-1;-1;-1;-1;-1;-1") {

              if(ipfsContentList[0] == FARM_ID) {
                farmMenuAddr = ipfsContentList[1]; //farm menu sc addr
                console.log("Farm Menu SC: ", farmMenuAddr);
                return farmMenuAddr;
              }

              if (ipfsContentList.length > 1) { 
                  cid = ipfsContentList[2];
              }
          }
      }

      farmMenuAddr = "";

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function waitForCatalogReady(ipfs) {
  let farmMenuIpnsKey = ""
  console.log("Wait for Catalog SC be ready...");
  
  while(farmMenuIpnsKey == "") {
    farmMenuIpnsKey = await catalogContract.farmMenuListIpnsKey();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function node_fsm() {
  const { create } = await import('ipfs-http-client');
  const ipfs = await create({ url: 'http://127.0.0.1:5001'});
  let isHandlingEvent = false; // Flag to indicate if handleEvent is running
  let isGeneratingMetadata = false; // Flag to indicate if generateMetadataAndProcess is running

  await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds

  FARM_ID = await getFarmId();
  await waitForCatalogReady(ipfs)

  //get the farm menu addr
  farmSc = await getFarmMenuAddr(ipfs);
  //Create a farm menu contract instance
  farmMenuContract = new ethers.Contract(farmSc, farmMenuContractAbi.abi, signer);

  await waitForNetworkReady(ipfs);
  
  console.log("\nNetwork configured!\n");
  
  await generateGtwCatalogInstance();
  await checkPrivateCatalog(ipfs);

  let n = 0;
  let totalElapsedTime = 0;

  const generateMetadataAndProcess = async () => {
    if (!isHandlingEvent && !isGeneratingMetadata) { // Check if handleEvent and generateMetadataAndProcess are not running
      isGeneratingMetadata = true; // Set the flag to true while generateMetadataAndProcess is running

      try {
        console.log("\n\nReading new sensor data...");

        const startTime = process.hrtime();

        const metadata = await getSensorData();
        const deviceIDList = metadata.split(';');
        const deviceID = deviceIDList[0];
      
        const datasetExists = await checkDatasetIpns(ipfs, deviceID);
        if (!datasetExists) {
          await generateNodeIpnsKey(ipfs, deviceID);
        } else {
          nodeIpnsKey = "Farm" + FARM_ID + '_' + "Device" + deviceID + "IpnsKey"; //ipns key name
          console.log("nodeIpnsKey: ", nodeIpnsKey);
        }
      
        const lastCid = await getLastIpfsCid(ipfs, deviceID);
        const data = metadata + ';' + lastCid;
      
        console.log("Next value: ", data);
        const ipfs_cid = await addIpfsFile(data);
        await ipfsAddLocal(ipfs, data); //replicate to accelerate the ipns publish
      
        await publishToIpns(ipfs, ipfs_cid, nodeIpnsKey, 30*1000);

        const endTime = process.hrtime(startTime);
        console.log("EndTime: ", endTime);
        const elapsedTime = (endTime[0]*1000+endTime[1]/1000000)/1000;
        console.log("ElapsedTime: ", elapsedTime);

        totalElapsedTime += elapsedTime;
        n += 1;

        const average = (totalElapsedTime/n);
        console.log("Average: ", average);

        const csvData = `${n};${elapsedTime};${average}\n`;
        fs.appendFile("./app/Results/tx_results.txt", csvData, (err) => {
        if (err) throw err;
          console.log('Data appended to the CSV file.');
        });

      } catch (error) {
        console.error("Error occurred while generating metadata:", error);
        // Handle the error accordingly
      } finally {
        isGeneratingMetadata = false; // Set the flag back to false after generateMetadataAndProcess finishes
      }
    } else {
      console.log("Waiting for handleEvent to finish before generating metadata...");
    }
  };
  
  // Execute the function immediately and then every 6 minutes
  generateMetadataAndProcess();
  setInterval(() => {
    if (!isGeneratingMetadata) { // Check if generateMetadataAndProcess is not running
      generateMetadataAndProcess();
    } else {
      console.log("Waiting for generateMetadataAndProcess to finish before triggering again...");
    }
  }, 1 * 60 * 1000); //1 minute
}

node_fsm();
