import Image from "next/image";
import Form from "@/components/Form";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";

export default function Home() {
  return (
    <div className="bg-black">
      <Nav />

      {/* <h1 className="">hello world</h1> */}
      <Hero />
      <div id="target-section" className="mt-10">
        <Form />
      </div>
    </div>
  );
}
