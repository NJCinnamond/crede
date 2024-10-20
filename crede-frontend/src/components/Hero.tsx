"use client";

import Image from "next/image";
import shh from "/public/shh.png";
import layerzero from "/public/layerzero.png";
import polygon from "/public/polygon.png";
import skale from "/public/skale.png";

export default function Hero() {
  const handleScroll = () => {
    const section = document.getElementById("target-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };
  return (
    <div className="relative mt-28 flex h-screen flex-col items-center justify-between overflow-hidden bg-black">
      {/* Content (Header and Image) */}
      <div className="relative z-10 flex flex-col items-center gap-10">
        <div className="mt-56 flex items-center gap-32">
          <div className="">
            <h1 className="pb-10 text-7xl text-white">
              Reveal Less, Live More
            </h1>
            <h2 className="relative z-10 ml-1 text-2xl text-white">
              Crède lets you take control of your identity
            </h2>
          </div>
          <div>
            <Image
              src={shh}
              alt="shh"
              width={350}
              height={350}
              className="animate-spin-slow"
            />
          </div>
        </div>
        <button
          onClick={handleScroll}
          className="relative z-10 rounded-full border-4 border-white bg-black px-12 py-6 text-2xl tracking-widest text-white transition duration-300 ease-in-out hover:animate-flashGradient hover:bg-gradient-to-r hover:from-purple-500 hover:via-pink-500 hover:to-yellow-500">
          Get Started
        </button>
      </div>

      {/* Tilted gray rectangle (set behind using z-index) */}
      <div className="absolute bottom-[-600px] left-0 z-0 h-[80vh] w-full origin-bottom-left rotate-[-10deg] transform rounded-md bg-[#0B0C0C] bg-opacity-95 shadow-[0_0_30px_10px_rgba(255,255,255,0.3)]"></div>

      {/* Layerzero image at the bottom */}
      <div className="relative z-10 mt-48 flex w-full items-center justify-evenly bg-black py-10 pb-10">
        <div className="absolute bottom-0 left-0 h-1 w-full">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
        </div>
        <Image
          src={layerzero}
          alt="layerzero"
          width={350}
          height={350}
          className=""
        />
        <Image
          src={polygon}
          alt="polygon"
          width={200}
          height={200}
          className=""
        />
        <Image
          src={skale}
          alt="skale"
          width={300}
          height={300}
          className="ml-10"
        />
        <div className="absolute left-0 top-0 h-1 w-full">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
        </div>
      </div>
    </div>
  );
}
