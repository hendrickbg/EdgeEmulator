const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI3MTMxZTcwNi03N2ZlLTQ0MDctYWE5OC0xNDg4OTE2OGVkMTMiLCJlbWFpbCI6ImhlbmRyaWNrLmdvbmNhbHZlc0BlZHUucHVjcnMuYnIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNmI4OWNhZmU2NmQ3ZWNkYTQ1OTMiLCJzY29wZWRLZXlTZWNyZXQiOiJkYzFiM2I1NTdjNTVjYmJhNDRjZTQ5N2I3Y2NiNTNlMzQ1ODdmN2Y5MThjMmU3NzViZDI1MmQ2MjAyMTEwNDU4IiwiaWF0IjoxNzAwMDcxMjQ2fQ.dyLJcWzw9dcs7tEYu24q7QPZQ35eKphJgkDHPl3x5fA";
const PIN_QUERY = `https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=1000&includeCount=false`;
const fetch = require("node-fetch");

const wait = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const fetchPins = async () => {
  try {
    console.log("Fetching pins...");
    let pinHashes = [];
    let pageOffset = 0;
    let hasMore = true;

    while (hasMore === true) {
      try {
        const response = await fetch(`${PIN_QUERY}&pageOffset=${pageOffset}`, {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${PINATA_JWT}`,
          },
        });
        const responseData = await response.json();
        const rows = responseData.rows;

        if (rows.length === 0) {
          hasMore = false;
        }
        const itemsReturned = rows.length;
        pinHashes.push(...rows.map((row) => row.ipfs_pin_hash));
        pageOffset += itemsReturned;
        // await wait(50);
      } catch (error) {
        console.log(error);
        break;
      }
    }
    console.log("Total pins fetched: ", pinHashes.length);
    return pinHashes;
  } catch (error) {
    console.log(error);
  }
};

const deletePins = async () => {
  const pinHashes = await fetchPins();
  const totalPins = pinHashes.length;
  let deletedPins = 0;
  try {
    for (const hash of pinHashes) {
      try {
        const response = await fetch(
          `https://api.pinata.cloud/pinning/unpin/${hash}`,
          {
            method: "DELETE",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${PINATA_JWT}`,
            },
          }
        );
        // await wait(50);
        deletedPins++;
        process.stdout.write(`Deleted ${deletedPins} of ${totalPins} pins\r`);
      } catch (error) {
        console.log(error);
      }
    }
    console.log("Pins deleted");
  } catch (error) {
    console.log(error);
  }
};

deletePins();
