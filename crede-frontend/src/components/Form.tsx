"use client";

import { useState } from "react";
import { buildPoseidon } from "circomlibjs";
// import { getSignatureForHash } from "../../rpc/skale";
import {
  ProofGenerationPayload,
  generateAndWaitForProof,
  verifyProof,
} from "@/services/credeApiService";
import { PacmanLoader } from "react-spinners";

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

export default function Form() {
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
      <div className="mx-auto w-2/5 rounded-bl-lg rounded-br-lg rounded-tr-lg bg-[#1A1D22] p-8">
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

            <button className="mt-8 rounded-md border-2 bg-[#1A1D22] px-4 py-2 font-medium text-white">
              Sign Hash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
