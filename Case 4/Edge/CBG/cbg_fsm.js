const axios = require('axios')
const FormData = require('form-data')
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path'); // Add the path module
const { exec } = require('child_process');
const moment = require('moment');

////////////////////////////////////////PUBLIC POLYGON CODE//////////////////////////////////////////////////////

const API_URL = process.env.API_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CATALOG_CONTRACT_ADDRESS = process.env.CATALOG_CONTRACT_ADDRESS;

const catalogContractJson = require("./artifacts/contracts/Catalog.sol/Catalog.json");
const farmMenuContractAbi = require("./artifacts/contracts/Catalog.sol/FarmMenu.json");

const abi = catalogContractJson.abi;

const provider = new ethers.providers.JsonRpcProvider(API_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const catalogContract = new ethers.Contract(CATALOG_CONTRACT_ADDRESS, abi, signer);

var count = 0;

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI3MTMxZTcwNi03N2ZlLTQ0MDctYWE5OC0xNDg4OTE2OGVkMTMiLCJlbWFpbCI6ImhlbmRyaWNrLmdvbmNhbHZlc0BlZHUucHVjcnMuYnIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNmI4OWNhZmU2NmQ3ZWNkYTQ1OTMiLCJzY29wZWRLZXlTZWNyZXQiOiJkYzFiM2I1NTdjNTVjYmJhNDRjZTQ5N2I3Y2NiNTNlMzQ1ODdmN2Y5MThjMmU3NzViZDI1MmQ2MjAyMTEwNDU4IiwiaWF0IjoxNzAwMDcxMjQ2fQ.dyLJcWzw9dcs7tEYu24q7QPZQ35eKphJgkDHPl3x5fA'
var fileContent = "";
var cnt = 0;
const fileName = 'ipfs_file.txt';

const FARM_ID = "1";
var farmOutputIpnsPk = "";
let farmSc = "";
let farmMenuContract;

////////////////////////////////////////PRIVATE ETHEREUM CODE/////////////////////////////////////////////////////

const privateProvider = new ethers.providers.JsonRpcProvider("http://191.4.204.172:8545");

// Read contract bytecode from file
const contractHex = fs.readFileSync('contractHex.txt', 'utf8');
const privContractAbi = [{"inputs":[],"name":"catalogIpnsKey","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"outputIpnsKey","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"privateKeyCid","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_caralog_ipns_key","type":"string"}],"name":"setCatalogIpnsKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_output_ipns_key","type":"string"}],"name":"setOuputIpnsKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_sk_cid","type":"string"}],"name":"setPrivateKeyCid","outputs":[],"stateMutability":"nonpayable","type":"function"}];
const contractInterface = new ethers.ContractFactory(privContractAbi, contractHex, privateProvider.getSigner());
let gtwCatalogContract;

let gtwContractAddress;

// Function to scan recent blocks for contract creation transactions
async function getLastScAddress() {
    try {
        // Get the latest block number
        const latestBlockNumber = await privateProvider.getBlockNumber();

        // Specify the range of blocks to scan (e.g., 100 blocks before the latest block)
        const startBlockNumber = Math.max(0, latestBlockNumber - 100);

        // Iterate through the specified range of blocks
        for (let blockNumber = latestBlockNumber; blockNumber >= startBlockNumber; blockNumber--) {
            const block = await privateProvider.getBlockWithTransactions(blockNumber);

            // Iterate through transactions in the block
            for (const tx of block.transactions) {
                const txReceipt = await privateProvider.getTransactionReceipt(tx.hash);

                // Check if the transaction is a contract creation
                if (txReceipt && txReceipt.contractAddress) {
                    console.log("Contract address discovered:", txReceipt.contractAddress);
                    return txReceipt.contractAddress; // Stop scanning once contract address is found
                }
            }
        }

        console.log("No contract creation transactions found in the recent blocks.");
        return '';

    } catch (error) {
        console.error("Error scanning recent blocks:", error);
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

async function checkPrivateCatalog(ipfs) {

  gtwContractAddress = await deployContract();

  var privateKeyCid = await gtwCatalogContract.privateKeyCid();
  console.log("PrivateKey: ", privateKeyCid);

  var keyExists = false;
  var key = "";

  if(privateKeyCid == '') {
    const privateScIpnsSk = 'IpnsSecretKey'; //ipns key name

    keyExists = await checkIPNSKeyNameExists(ipfs, privateScIpnsSk);

    if(keyExists == false) {
      console.log("Generating a new IPNS key for Gateway Catalog...");
      key = await ipfs.key.gen(privateScIpnsSk, { type: 'rsa', size: 2048 });
    } else{
      const keys = await ipfs.key.list();
      key = await keys.find((k) => k.name === privateScIpnsSk);
    }

    //const exportedKey = await ipfs.key.export(privateScIpnsSk);
    const tmpKey = await exportKey(privateScIpnsSk);
    const tmpPath = 'exportedKey.key';
    const exportedKey = await readFileAndDecode(tmpPath);

    var ipfs_cid = await addIpfsFile(exportedKey);

    var tx = await gtwCatalogContract.setOuputIpnsKey(ipfs_cid);
    
    // Wait for the transaction to be mined
    await tx.wait();

    var ipfs_cid = await addIpfsFile("-1;-1;-1;-1;-1;-1");
  
    //populate this IPNS key
    await publishToIpns(ipfs, ipfs_cid, privateScIpnsSk, 1000*30); //15s of timeout

    tx = await gtwCatalogContract.setCatalogIpnsKey(key.id);
    await tx.wait();
  }
  
  var outputIpnsKey = await gtwCatalogContract.outputIpnsKey();
  console.log("OutputIpnsKey: ", outputIpnsKey);

  if(outputIpnsKey == '') {
    const outputIpnsKey = 'PrivateOutputIpnsKey'; //ipns public key name

    keyExists = await checkIPNSKeyNameExists(ipfs, outputIpnsKey);

    if(keyExists == false) {
      console.log("Generating a new Private Output IPNS key for Gateway Catalog...");
      key = await ipfs.key.gen(outputIpnsKey, { type: 'rsa', size: 2048 });
    } else{
      const keys = await ipfs.key.list();
      key = await keys.find((k) => k.name === outputIpnsKey);
    }

    tx = await gtwCatalogContract.setOuputIpnsKey(key.id);
    await tx.wait();
  }
}

async function setReadyFlag(value) {
  const tx = await farmMenuContract.setReadyFlag(value);
  await tx.wait();
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

  return (ipfs_cid);
}

async function catIpfsGateway(cid) {
  try {
    const response = await axios.get(`https://ipfs.io/ipfs/${cid}`);
    //console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

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

  console.log("IPFS CID: ", ipfs_cid);

  //populate its dataset IPNS key
  await publishToIpns(ipfs, ipfs_cid, nodeIpnsKey, 1000*30); //15s of timeout

  //publishes its dataset IPNS key to catalog IPNS key
  const catalogIpnsKey = await gtwCatalogContract.catalogIpnsKey(); 
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

  console.log("fileAdded: ", ipfs_cid);

  //no caso do gateway, ele ja tem a chave, se nao teria que importar
  //const catalogIpnsKeyName = await importCatalogIpnsKeyName(ipfs);
  await publishToIpns(ipfs, ipfs_cid, "IpnsSecretKey", 5000); 
}

async function checkDatasetIpns(ipfs, deviceID) {
  const catalogIpnsKey = await gtwCatalogContract.catalogIpnsKey(); 
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
  const catalogIpnsKey = await gtwCatalogContract.catalogIpnsKey(); 
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

  while(true) {
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
        console.error('Error pinning file to IPFS! Tying again..');
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }
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
  const secretKeyCid = await catalogContract.farmMenuListSecretKey(); 

  console.log("Secret key CID: ", secretKeyCid);

  // const data = ipfs.cat(secretKeyCid);
  // const metadata_chunks = []
  // for await (const chunk of data) {
  //     metadata_chunks.push(chunk)
  // }
  
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

async function getSensorData() {
  const deviceID = '0'; //CBG Gateway will be always device 0!
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

async function node_fsm() {
  const { create } = await import('ipfs-http-client');
  const ipfs = await create({ url: 'http://127.0.0.1:5001'});
  let isHandlingEvent = false; // Flag to indicate if handleEvent is running
  let isGeneratingMetadata = false; // Flag to indicate if generateMetadataAndProcess is running

  await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds

  await checkPublicCatalog(ipfs);
  await checkPrivateCatalog(ipfs);

  console.log("Everything ready!");

  // Inform all device nodes that the network is already configured!
  await setReadyFlag("1");

  var ipfs_cid = '';

  const handleEvent = async (info) => {
    if(!isHandlingEvent && !isGeneratingMetadata) {
      isHandlingEvent = true; // Set the flag to true while handleEvent is running
      console.log("\n\nEvent received:", info);
      
      // Continue with other actions based on the event
      if(info.eventName == "DataDeviceRequested") {
        console.log("Searching for Device: ", info.deviceID);
        const lastCid = await getLastIpfsCid(ipfs, info.deviceID);
        const txCid = await updaIpfsList(lastCid);

        console.log("CID that will be sent: ", txCid);

        const farmIpnsKey = "Farm" + FARM_ID + 'IpnsKey';
        //send data to output IPNS key of FarmMenu
        await publishToIpns(ipfs, txCid, farmIpnsKey, 1000*30); //15s of timeout

      } else if(info.eventName == "FarmDataRequested") {
        console.log("FarmDataRequested!");
        
        //catalogIpnsKey
        const ipnsPk = await gtwCatalogContract.catalogIpnsKey();
        console.log("PK that will be sent: ", ipnsPk);

        ipfs_cid = await addIpfsFile(ipnsPk);

        const farmIpnsKey = "Farm" + FARM_ID + 'IpnsKey';
        //send data to output IPNS key of FarmMenu
        await publishToIpns(ipfs, ipfs_cid, farmIpnsKey, 1000*30); //15s of timeout  
      }
    
    }

    isHandlingEvent = false; // Set the flag back to false after handleEvent finishes

    // Call waitForEvents again to listen for the next event with a delay
    setTimeout(() => {
      waitForEvents()
        .then(handleEvent)
        .catch((error) => {
          console.error("Error occurred:", error);
          // Handle the error accordingly
        });
    }, 500); // Delay in milliseconds
  };

  waitForEvents()
      .then(handleEvent)
      .catch((error) => {
        console.error("Error occurred:", error);
        // Handle the error accordingly
  });

  const generateMetadataAndProcess = async () => {
    if (!isHandlingEvent && !isGeneratingMetadata) { // Check if handleEvent and generateMetadataAndProcess are not running
      isGeneratingMetadata = true; // Set the flag to true while generateMetadataAndProcess is running

      try {
        console.log("\n\nReading new sensor data...");
        const metadata = await getSensorData();
        const deviceIDList = metadata.split(';');
        const deviceID = deviceIDList[0];
      
        const datasetExists = await checkDatasetIpns(ipfs, deviceID);
        if (!datasetExists) {
          await generateNodeIpnsKey(ipfs, deviceID);
        }
      
        const lastCid = await getLastIpfsCid(ipfs, deviceID);
        const data = metadata + ';' + lastCid;
      
        console.log("Next value: ", data);
        const ipfs_cid = await addIpfsFile(data);
      
        await publishToIpns(ipfs, ipfs_cid, nodeIpnsKey, 30*1000);
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
  }, 6 * 60 * 1000);
}

node_fsm();
