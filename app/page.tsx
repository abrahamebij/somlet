"use client";
import dynamic from "next/dynamic";
const LandingPage = dynamic(() => import("@/components/home/LandingPage"), {
  ssr: false,
});

const Home = () => {
  return <LandingPage />;
};

export default Home;
