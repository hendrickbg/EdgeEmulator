const { ethers } = require('ethers');
const fs = require('fs');

const API_URL = process.env.API_URL;
const API_KEY = process.env.ACHEMY_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const ContractJson = require("../artifacts/contracts/HelloWorld.sol/HelloWorld.json");

const abi = ContractJson.abi;

const provider = new ethers.providers.JsonRpcProvider(API_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

var count = 0;

async function update_sc() {
  const { create } = await import('ipfs-http-client');
  const ipfs = await create({ url: 'http://127.0.0.1:4001' });

  console.log("\nUpdate Smart Contract function running...");
  const fileAdded = await ipfs.add({
    path: "ipfs_file.txt",
    content: `[${count}] Testing Gremio...`
  });

  // Read the current message
  const currentMessage = await contract.message();
  console.log('Current Message:', currentMessage);

  // Update the message
  const updateTx = await contract.update(fileAdded.cid.toString());
  await updateTx.wait();
  console.log('Message Updated!');

  // Read the updated message
  const updatedMessage = await contract.message();
  console.log('Updated Message:', updatedMessage);

  count += 1;

  console.log("Finishing process...");
}

setInterval(()=>{
  update_sc();
}, 10000);
