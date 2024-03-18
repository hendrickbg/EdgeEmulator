// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

//import "hardhat/console.sol";

contract GatewayCatalog {

    string public catalogIpnsKey; //lista de devices disponiveis
    string public outputIpnsKey; //saida
    string public outputIpnsPrivateKey; //output private key to import
    string public privateKeyCid; //cid where is stored the private key for import the ipns

    constructor() {
        catalogIpnsKey = "0";
        outputIpnsKey = "0";
        outputIpnsPrivateKey = "0";
        privateKeyCid = "0";
    }

    function setOutputIpnsPrivateKey(string memory _output_ipns_private_key) public {
        outputIpnsPrivateKey = _output_ipns_private_key;
    }

    function setCatalogIpnsKey(string memory _caralog_ipns_key) public {
        catalogIpnsKey = _caralog_ipns_key;
    }

    function setOuputIpnsKey(string memory _output_ipns_key) public {
        outputIpnsKey = _output_ipns_key;
    }

    function setPrivateKeyCid(string memory _sk_cid) public {
        privateKeyCid = _sk_cid;
    }
}