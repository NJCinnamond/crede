"use client";

import { useState } from "react";
import { buildPoseidon } from "circomlibjs";

export default function Form() {
  const [activeTab, setActiveTab] = useState<string>("form1"); // State to track active tab
  const [birthdate, setBirthdate] = useState<string>("");
  const [idNumber, setIdNumber] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [responseMessage, setResponseMessage] = useState<string>("");

  const splitBigIntToHexChunks = (bigIntValue: bigint) => {
    const mask = BigInt("0xFFFFFFFFFFFFFFFF");
    const chunks = [];

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
    <div className="mt-52 h-screen p-20">
      {/* Tabs for switching between forms */}
      <div className="relative mx-auto w-2/5  ">
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
        {activeTab === "form1" && (
          <form
            onSubmit={handleSubmit}
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
              className="mt-6 rounded-md border-2 bg-[#1A1D22] px-4 py-4 font-medium text-white">
              Generate Proof
            </button>
          </form>
        )}

        {activeTab === "form2" && (
          <form
            onSubmit={handleSubmit}
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
              className="mt-6 rounded-md border-2 bg-[#1A1D22] px-4 py-4 font-medium text-white">
              Generate Proof
            </button>
          </form>
        )}
      </div>

      {/* Response Message */}
      {responseMessage && (
        <p className="mx-auto mt-4 w-2/5 text-center text-lg text-white">
          {responseMessage}
        </p>
      )}
    </div>
  );
}
