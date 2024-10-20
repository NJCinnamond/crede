"use client";
import Image from "next/image";
import credeLogo from "/public/credeLightTrans.svg";

export default function Nav() {
  const handleScroll = () => {
    const section = document.getElementById("target-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className="relative flex items-center justify-between bg-black px-10"
      id="wrapper">
      <div id="logo">
        <Image
          className="ml-10"
          alt="crede logo"
          width={200}
          height={200}
          src={credeLogo}
        />
      </div>
      <div id="nav-links">
        <button
          onClick={handleScroll}
          className="realtive border-3 rounded-full border-4  border-white bg-black px-12 py-6 text-2xl tracking-widest text-white transition duration-300 ease-in-out hover:animate-flashGradient hover:bg-gradient-to-r hover:from-purple-500 hover:via-pink-500 hover:to-yellow-500">
          Get Started
        </button>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
      </div>
    </nav>
  );
}
