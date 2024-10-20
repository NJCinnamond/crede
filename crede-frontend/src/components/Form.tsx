"use client";

import { useCallback, useEffect, useState } from "react";
import { buildPoseidon } from "circomlibjs";
import {
  ProofGenerationPayload,
  generateAndWaitForProof,
  verifyProof,
} from "@/services/credeApiService";
import { PacmanLoader } from "react-spinners";
import { BigNumber, ethers } from "ethers";
import {ContractABI,IERC20ABI} from "../../rpc/Contract";
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { Options } from "@layerzerolabs/lz-v2-utilities";

const splitBigIntToHexChunks = (bigIntValue: bigint) => {
  const mask = BigInt("0xFFFFFFFFFFFFFFFF");
  const chunks = [];

  for (let i = 0; i < 4; i++) {
    chunks.push("0x" + (bigIntValue & mask).toString(16));
    bigIntValue = bigIntValue >> BigInt(64);
  }

  return chunks;
};

function convertMsgHash(msgHashParts: string[]): string {
  return "0x" + msgHashParts.map((part) => part.replace("0x", "")).join("");
}

interface DocInfo {
  prover: string;
  timestamp: number;
  signedHash: string;
  proof: string;
}

export default function Form() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [token, setToken] = useState<ethers.Contract | null>(null);
  const [info, setInfo] = useState<DocInfo | null>(null);

  const [activeTab, setActiveTab] = useState<string>("form1"); // State to track active tab
  const [birthdate, setBirthdate] = useState<string>("");
  const [idNumber, setIdNumber] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [responseMessage, setResponseMessage] = useState<string>("");

  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [fetchedProof, setFetchedProof] = useState<string | null>(null);
  const [fetchedJobID, setFetchedJobID] = useState<string | null>(null);

  const onProofVerify = async () => {
    if (!fetchedProof || !fetchedJobID) {
      return null;
    }

    console.log("IS VERIFYING");

    setIsVerifying(true);

    try {
      await verifyProof({
        id: fetchedJobID,
        proof: fetchedProof,
      });
      setIsVerifying(false);
    } catch (error) {
      console.error("Error veirfying the proof", error);
      setResponseMessage("Failed to verify proof.");
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    const expiryDateObj = new Date(expiryDate);
    const formattedExpiryDate = `${(expiryDateObj.getDate() + 1)
      .toString()
      .padStart(2, "0")}${(expiryDateObj.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${expiryDateObj.getFullYear()}`;
    const birthdateObj = new Date(birthdate);

    const formattedBirthDate = `${(birthdateObj.getDate() + 1)
      .toString()
      .padStart(2, "0")}${(birthdateObj.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${birthdateObj.getFullYear()}`;

    // convert ID, birthdate, and expiry date to BigInt
    const idNumberBigInt = BigInt(idNumber);
    const birthdateBigInt = BigInt(formattedBirthDate);
    const expiryDateBigInt = BigInt(formattedExpiryDate);

    const poseidon = await buildPoseidon();

    const inputs = [birthdateBigInt, idNumberBigInt, expiryDateBigInt];

    const poseidonHashBigInt = BigInt(poseidon.F.toString(poseidon(inputs)));

    const msghashChunks = splitBigIntToHexChunks(poseidonHashBigInt);

    // Calculate current timestamp unix time in seconds
    const currentTimestamp: string = Math.floor(Date.now() / 1000).toString();

    // TODO: query the scale API to get signature
    const docKeyHash = convertMsgHash(msghashChunks);
    console.log("Doc key hash: ", docKeyHash);
    // const docInfo = await getSignatureForHash(docKeyHash)

    // crypographic signature fetched from blockchain (use external blockchain library)
    //const sig_r: string[] = ["signature_r"];
    //const sig_s: string[] = ["signature_s"];

    const sig_r: string[] = [
      "0x2df01549a50bc279",
      "0x5d7eb2e38d83a563",
      "0xe99cc599fd61a917",
      "0x4d0bf5623c59274d",
    ];

    const sig_s: string[] = [
      "0xba1abc8b2649ae5c",
      "0xfdba11b93523cc06",
      "0x74ed0f8cb647b4ce",
      "0x129e301b0dad2386",
    ];

    const pub_key: string[][] = [
      [
        "0x5017dcb88e507d84",
        "0xb81b1d2ca0e8ad16",
        "0xe4fa30772b71fad8",
        "0xd56e7faa66e7d481",
      ],
      [
        "0x03d7e3d9ed743025",
        "0xf54e3483770694f3",
        "0x257b2728c36d06e2",
        "0xdcbc845e2a192239",
      ],
    ];

    const payload: ProofGenerationPayload = {
      birthdate_timestamp: Number(birthdateBigInt),
      id_number: Number(idNumber),
      expiry_date: Number(expiryDateBigInt),
      msghash: msghashChunks,
      sig_r: sig_r,
      sig_s: sig_s,
      pub_key: pub_key,
      current_timestamp: currentTimestamp,
    };

    try {
      setIsFetching(true);

      //await new Promise((resolve) => setTimeout(resolve, 500));
      // Example usage:
      const response = await generateAndWaitForProof(payload);

      // const data = await response.json();
      setResponseMessage(`Status: ${response}`);

      if (response.proof.proof) {
        setFetchedProof(response.proof.proof);
      }

      if (response.proof.id) {
        setFetchedJobID(response.proof.id);
      }

      console.log("RESPONSE: ", response);
      setIsFetching(false);
    } catch (error) {
      console.error("Error submitting the form", error);
      setResponseMessage("Failed to generate proof.");
      setIsFetching(false);
    }
  };


  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        try {
          // Request account access if needed
          await window.ethereum.request({ method: 'eth_requestAccounts' });

          // Set provider
          const newProvider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(newProvider);

          const newSigner = newProvider.getSigner();

          // Get account
          const newAccount = await newSigner.getAddress();
          setAccount(newAccount);

          // Create the contract instance
          const newContract = new ethers.Contract("0xf7f861870aC67B27322E6f23f3442E660103Ce00", ContractABI, newSigner);
          setContract(newContract);

          const tokenContract = new ethers.Contract("0x6c71319b1F910Cf989AD386CcD4f8CC8573027aB", IERC20ABI, newSigner);
          setToken(tokenContract);

          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts: string[]) => {
            setAccount(accounts[0]);
          });

          // Listen for network changes
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        } catch (error) {
          console.error('Error connecting to MetaMask', error);
        }
      } else {
        alert('Please install MetaMask!');
      }
    };

    
    initProvider();
  }, [provider, contract]);
  
  const getDocInfo = useCallback(async () => {
    if (!contract) {
      return;
    }
    const docKeyHash = "0x3fa871cd666032ad35b81e203f034a394a41145d6e411b93c91c4149027bba00"
    return await contract.docInfos(docKeyHash);
  }, [contract])

  useEffect(() => {
    getDocInfo().then((docInfo) => {
      console.log("Doc Info: ", docInfo);
      setInfo(docInfo);
    });
  },[getDocInfo])

  const callIssueDoc = useCallback(async () => {
      if (!contract || !token || !account) {
        return;
      }

      // Defining the amount of tokens to send and constructing the parameters for the send operation
      const tokensToSend = ethers.utils.parseEther("1");

      // Defining extra message execution options for the send operation
      const options = Options.newOptions().addExecutorLzReceiveOption(2000000, 0).toHex().toString();

      await token.approve(contract.address, ethers.utils.parseEther("100000000000000000"));

      const sendParam = [
        EndpointId.AMOY_V2_TESTNET,
        ethers.utils.zeroPad(account, 32),
        tokensToSend,
        tokensToSend,
        options,
        "0x",
      ]

      // Fetching the native fee for the token send operation
      const [nativeFee] = await contract.quoteSend(sendParam, false);

      console.log("nativeFee: ", nativeFee);

      // fee
      const fee = {
        nativeFee,
        lzTokenFee: 0,
      };

      const docKeyHash = "0x3fa871cd666032ad35b81e203f034a394a41145d6e411b93c91c4149027bba00"

      const signedHash = ethers.utils.toUtf8Bytes(
        '{"sigR":["0x2df01549a50bc279","0x5d7eb2e38d83a563","0xe99cc599fd61a917","0x4d0bf5623c59274d"],"sigS":["0xba1abc8b2649ae5c","0xfdba11b93523cc06","0x74ed0f8cb647b4ce","0x129e301b0dad2386"]}'
      );

      const tx = await contract.issueDoc(account, docKeyHash, signedHash, sendParam, fee, {
        value: nativeFee.add(BigNumber.from("10000000000000000")),
      });
      console.log(`Transaction hash: ${(await tx.wait()).transactionHash}`);
  }, [contract, token, account])

  const setProof = useCallback(async () => {

      if (!contract) {
        return;
      }

      const sampleProof = ethers.utils.toUtf8Bytes(
      '{"curve":"bn128","pi_a":["9101883383049000104073619355601631108699415048629057425244512952930590364012","14934657682890689746053652093146976332194029865174971459032167110397473537949","1"],"pi_b":[["14021879761272328052390042351303534418318878686560723234568697033225283024566","4806846995601770419162529313601536774988514956526598728824403473260395977689"],["13709445512919846353785661709905806350777195619348686974284763017443907186970","4414084233285007101997778311773381986137166860704772030966271135988114835460"],["1","0"]],"pi_c":["20800646827339092164260847061948185912328706503481541270320821731079287451974","16340311457184926111282441001594733088258559531093324393067085734266031169503","1"],"protocol":"groth16"}'
    );
    
    const bytes = ethers.utils.toUtf8Bytes("0x8c8d678fb414a28c6b55dcd33c306453cbeaaa8472f8361d24093fd7d2db574f");
    const docKeyHash = ethers.utils.keccak256(bytes);

      // timestamp
  const timestamp = Math.floor(Date.now() / 1000);

  const tx = await contract.setProof(docKeyHash, sampleProof, timestamp);
  console.log(`Transaction hash: ${(await tx.wait()).transactionHash}`);


  }, [contract])

  return (
    <div className="mt-52 h-screen p-20">
      {/* Tabs for switching between forms */}
      <div className="relative mx-auto w-2/5">
        <div className="flex">
          <button
            className={`px-6 py-2 text-2xl ${
              activeTab === "form1"
                ? "rounded-t-lg  bg-[#1A1D22] text-white"
                : "bg-transparent text-white hover:rounded-t-lg hover:bg-gradient-to-r hover:from-purple-500 hover:via-pink-500 hover:to-yellow-500"
            }`}
            onClick={() => setActiveTab("form1")}>
            Prover
          </button>
          <button
            className={`px-6 py-2 text-2xl ${
              activeTab === "form2"
                ? "rounded-t-lg bg-[#1A1D22] text-white"
                : " bg-transparent text-white hover:rounded-t-lg hover:bg-gradient-to-r hover:from-purple-500 hover:via-pink-500 hover:to-yellow-500"
            }`}
            onClick={() => setActiveTab("form2")}>
            Issuer
          </button>
        </div>
      </div>

      {/* Render the corresponding form based on the active tab */}
      <div className="mx-auto w-2/5 rounded-bl-lg rounded-br-lg rounded-tr-lg  bg-[#1A1D22] p-8">
        
      <div className="flex flex-col items-center p-4 gap-4 justify-center text-center">
        {
          account ? (
            <p className="text-white">Connected with account: {account}</p>
          ) : (
            <p className="text-white">Not connected</p>
          )
        }
      </div>
        
        {activeTab === "form1" && (
          <div className="flex flex-col space-y-6 text-2xl">
            {/* Birthdate Field */}
            <div className="mb-8 flex flex-col space-y-2">
              <label className="mb-2 font-medium tracking-widest text-white">
                Birthdate:
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                className="rounded border-2 p-2"
              />
            </div>

            {/* ID Number Field */}
            <div className="mb-8 flex flex-col space-y-2">
              <label className="mb-2 font-medium tracking-widest text-white">
                ID Number:
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                required
                className="rounded border-2 p-2"
              />
            </div>

            {/* Expiry Date Field */}
            <div className="mb-8 flex flex-col space-y-2">
              <label className="mb-2 font-medium tracking-widest text-white">
                Expiration Date:
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
                className="rounded border-2 p-2"
              />
            </div>

            {/* Submit Button */}

            {fetchedProof ? (
              <>
                <span>{"Proof fetched successfully"}</span>
                <button
                  onClick={onProofVerify}
                  className="border-2 border-blue-500">
                  {"Verify"}
                </button>
              </>
            ) : (
              <button
                onClick={handleSubmit}
                className="mt-6 rounded-md border-2 bg-[#1A1D22] px-4 py-4 font-medium text-white">
                Generate Proof
              </button>
            )}
            <div style={{ margin: "2em" }}>
              <PacmanLoader
                color="yellow"
                loading={isFetching || isVerifying}
              />
            </div>
            {responseMessage && <p>{responseMessage}</p>}
          </div>
        )}

        {activeTab === "form2" && (
          <div
            onClick={handleSubmit}
            className="flex flex-col space-y-6 text-2xl">
            {/* Birthdate Field */}
            <div className="mb-8 flex flex-col space-y-2">
              <label className="mb-2 font-medium tracking-widest text-white">
                Birthdate:
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                className="rounded border-2 p-2"
              />
            </div>

            {/* ID Number Field */}
            <div className="mb-8 flex flex-col space-y-2">
              <label className="mb-2 font-medium tracking-widest text-white">
                ID Number:
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                required
                className="rounded border-2 p-2"
              />
            </div>

            {/* Expiry Date Field */}
            <div className="mb-8 flex flex-col space-y-2">
              <label className="mb-2 font-medium tracking-widest text-white">
                Expiration Date:
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
                className="rounded border-2 p-2"
              />
            </div>


          </div>
        )}
            <button className="mt-8 rounded-md border-2 bg-[#1A1D22] px-4 py-2 font-medium text-white"
            onClick={setProof}
            >
              Sign Hash
            </button>
        <button 
          className="mt-8 rounded-md border-2 bg-[#1A1D22] px-4 py-2 font-medium text-white"
          onClick={callIssueDoc}
        >
          Issue Doc
        </button>

        {info ? JSON.stringify(info): "no info"}

        {info ? (
          <div className="mt-8 p-4 bg-gray-800 h-screen rounded-md text-white">
            <h3 className="text-xl font-bold mb-4">Document Information</h3>
            <p><strong>Prover:</strong> {info.prover}</p>
            <p><strong>Timestamp:</strong> {new Date(info.timestamp * 1000).toLocaleString()}</p>
            <p><strong>Signed Hash:</strong> {info.signedHash}</p>
            <p><strong>Proof:</strong> {info.proof}</p>
          </div>
        ) : (
          <p className="mt-8 text-white">No information available</p>
        )}
      </div>
    </div>
  );
}
