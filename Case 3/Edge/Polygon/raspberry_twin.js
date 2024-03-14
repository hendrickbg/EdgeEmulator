const axios = require('axios')
const FormData = require('form-data')
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path'); // Add the path module

const API_URL = process.env.API_URL;
const API_KEY = process.env.ACHEMY_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const ContractJson = require("./artifacts/contracts/HelloWorld.sol/HelloWorld.json");

const abi = ContractJson.abi;

const provider = new ethers.providers.JsonRpcProvider(API_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

var count = 0;

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI3MTMxZTcwNi03N2ZlLTQ0MDctYWE5OC0xNDg4OTE2OGVkMTMiLCJlbWFpbCI6ImhlbmRyaWNrLmdvbmNhbHZlc0BlZHUucHVjcnMuYnIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNmI4OWNhZmU2NmQ3ZWNkYTQ1OTMiLCJzY29wZWRLZXlTZWNyZXQiOiJkYzFiM2I1NTdjNTVjYmJhNDRjZTQ5N2I3Y2NiNTNlMzQ1ODdmN2Y5MThjMmU3NzViZDI1MmQ2MjAyMTEwNDU4IiwiaWF0IjoxNzAwMDcxMjQ2fQ.dyLJcWzw9dcs7tEYu24q7QPZQ35eKphJgkDHPl3x5fA'
var fileContent = "";
var cnt = 0;
const fileName = 'gremio.txt';

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

async function update_sc() {
  const formData = new FormData();
  const filePath = path.join(__dirname, fileName);

  console.log('Updating file...');
  const fileContent = `Bora caralho [${cnt}]`;
  await writeToFile(filePath, fileContent);
  cnt += 1;

  console.log('Creating read stream...');
  const fileStream = fs.createReadStream(filePath);

  console.log('Appending form data...');
  formData.append('file', fileStream);

  console.log('Stringifying metadata...');
  const pinataMetadata = JSON.stringify({ name: 'Gremio' });
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

      // Read the current message
      const currentMessage = await contract.message();
      console.log('Current Message:', currentMessage);

      // Update the message
      const updateTx = await contract.update(response.data.IpfsHash);
      await updateTx.wait();
      console.log('Message Updated!');

      // Read the updated message
      const updatedMessage = await contract.message();
      console.log('Updated Message:', updatedMessage);

      count += 1;
  } catch (error) {
      console.error('Error pinning file to IPFS:', error);
  }

  console.log("Finishing process...");
}

async function runSequentialUpdates() {
  while (true) {
    await update_sc();
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds
  }
}

runSequentialUpdates();
