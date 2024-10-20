"use client";

import { useState } from "react";
import { buildPoseidon } from "circomlibjs";

export default function Form() {
  // birthdate
  const [birthdate, setBirthdate] = useState<string>("");
  // idNumber
  const [idNumber, setIdNumber] = useState<string>("");
  // expiryDate
  const [expiryDate, setExpiryDate] = useState<string>("");
  // responseMessage
  const [responseMessage, setResponseMessage] = useState<string>("");

  const splitBigIntToHexChunks = (bigIntValue: bigint) => {
    const mask = BigInt("0xFFFFFFFFFFFFFFFF");
    let chunks = [];

    for (let i = 0; i < 4; i++) {
      chunks.push((bigIntValue & mask).toString(16));
      bigIntValue = bigIntValue >> BigInt(64);
    }

    return chunks.reverse();
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // convert ID, birthdate, and expiry date to BigInt
    const idNumberBigInt = BigInt(idNumber);
    const birthdateBigInt = BigInt(new Date(birthdate).getTime());
    const expiryDateBigInt = BigInt(new Date(expiryDate).getTime());

    // Initialize Poseidon
    const poseidon = await buildPoseidon();

    // prep inputs for Poseidon hash
    const inputs = [birthdateBigInt, idNumberBigInt, expiryDateBigInt];

    // Compute Poseidon hash and vert to BigInt
    const poseidonHashBigInt = BigInt(poseidon.F.toString(poseidon(inputs)));

    // Split POseidon hash BigInto into 4 chunks fo 64 bits
    const msghashChunks = splitBigIntToHexChunks(poseidonHashBigInt);

    // Calculate current timestamp unix time
    const currentTimestamp: string = Math.floor(Date.now() / 1000).toString();

    // hash logic (poseidon)
    // const msghash: string[] = ["hash1", "hash2"];
    // Poseidon hash inputs
    const hashInput = [idNumberBigInt, birthdateBigInt, expiryDateBigInt];

    // crypographic signature fetched from blockchain (use external blockchain library)
    const sig_r: string[] = ["signature_r"];
    const sig_s: string[] = ["signature_s"];

    const pub_key: string[][] = [["pub_key_part1", "pub_key_part2"]];

    const payload = {
      birthdate_timstamp: new Date(birthdate).getTime(),
      id_number: parseInt(idNumber),
      expiry_date: new Date(expiryDate).getTime(),
      msghash: msghashChunks,
      sig_r: sig_r,
      sig_s: sig_s,
      pub_key: pub_key,
      current_timestamp: currentTimestamp,
    };

    try {
      const mockResponse = {
        proof: `{
          "curve": "bn128",
          "pi_a": [
            "9101883383049000104073619355601631108699415048629057425244512952930590364012",
            "14934657682890689746053652093146976332194029865174971459032167110397473537949",
            "1"
          ],
          "pi_b": [
            [
              "14021879761272328052390042351303534418318878686560723234568697033225283024566",
              "4806846995601770419162529313601536774988514956526598728824403473260395977689"
            ],
            [
              "13709445512919846353785661709905806350777195619348686974284763017443907186970",
              "4414084233285007101997778311773381986137166860704772030966271135988114835460"
            ],
            ["1", "0"]
          ],
          "pi_c": [
            "20800646827339092164260847061948185912328706503481541270320821731079287451974",
            "16340311457184926111282441001594733088258559531093324393067085734266031169503",
            "1"
          ],
          "protocol": "groth16"
        }`,
        status: "success",
        id: "1729375417_9de893e8-eb77-4fa9-91e4-a1f68b177986",
      };

      await new Promise((resolve) => setTimeout(resolve, 500));
      // const response = await fetch("/generate-proof", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(payload),
      // });

      const data = mockResponse;
      // const data = await response.json();
      setResponseMessage(`Status: ${data.status}, Proof: ${data.proof}`);
    } catch (error) {
      console.error("Error submitting the form", error);
      setResponseMessage("Failed to generate proof.");
    }
  };

  return (
    <div className="mx-auto">
      <h1 className="text-xl">Generate Proof</h1>
      <div className="center m-10 w-3/5 border-4 p-10">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <label className="">
            Birthdate:
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              required
              className="border-2"
            />
          </label>
          <label>
            ID Number:
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
              className="border-2"
            />
          </label>
          <label>
            Expiry Date:
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
              className="border-2"
            />
          </label>
          <button type="submit" className="border-2 border-blue-500">
            Generate Proof
          </button>
        </form>
        {responseMessage && <p>{responseMessage}</p>}
      </div>
    </div>
  );
}
