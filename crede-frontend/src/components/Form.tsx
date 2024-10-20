"use client";

import { useState } from "react";
import { buildPoseidon } from "circomlibjs";

export default function Form() {
  const [birthdate, setBirthdate] = useState<string>("");
  const [idNumber, setIdNumber] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
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

    const idNumberBigInt = BigInt(idNumber);
    const birthdateBigInt = BigInt(new Date(birthdate).getTime());
    const expiryDateBigInt = BigInt(new Date(expiryDate).getTime());

    const poseidon = await buildPoseidon();

    const inputs = [birthdateBigInt, idNumberBigInt, expiryDateBigInt];

    const poseidonHashBigInt = BigInt(poseidon.F.toString(poseidon(inputs)));

    const msghashChunks = splitBigIntToHexChunks(poseidonHashBigInt);

    const currentTimestamp: string = Math.floor(Date.now() / 1000).toString();

    const payload = {
      birthdate_timstamp: new Date(birthdate).getTime(),
      id_number: parseInt(idNumber),
      expiry_date: new Date(expiryDate).getTime(),
      msghash: msghashChunks,
      current_timestamp: currentTimestamp,
    };

    try {
      const mockResponse = {
        proof: `{
          "curve": "bn128",
          "pi_a": ["example_data"],
          "pi_b": [["example_data"]],
          "pi_c": ["example_data"],
          "protocol": "groth16"
        }`,
        status: "success",
      };

      await new Promise((resolve) => setTimeout(resolve, 500));
      setResponseMessage(
        `Status: ${mockResponse.status}, Proof: ${mockResponse.proof}`
      );
    } catch (error) {
      console.error("Error submitting the form", error);
      setResponseMessage("Failed to generate proof.");
    }
  };

  return (
    <div className="mt-20 h-screen p-20">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-2/5 flex-col space-y-6 text-2xl ">
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
        <div className="mb-8  flex flex-col space-y-2">
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
        <button
          type="submit"
          className=" mt-8 rounded-md border-2 bg-[#1A1D22] px-4 py-2 font-medium text-white">
          Generate Proof
        </button>
      </form>

      {/* Response Message */}
      {responseMessage && <p className="mt-4 text-lg">{responseMessage}</p>}
    </div>
  );
}
