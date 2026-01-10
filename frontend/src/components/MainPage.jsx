import React from "react";
import nextworldWhite from "../assets/mainLogoWhite.png";
import heroBackgroundVideo from "../assets/main-page-nextworld-hero-background.mp4";
import whoAreWe from "../assets/who-are-we.jpg";
import FadeInOnScroll from "./FadeInOnScroll.jsx";
import ArticlesContainer from "./ArticlesContainer.jsx";
import ContactForm from "./ContactForm.jsx";
import { Link } from "react-router-dom";

const MainPage = () => {
  return (
    <div className="bg-black">
      {/* Hero Section */}
      <section className="relative w-full h-screen lg:screen overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video
            src={heroBackgroundVideo}
            playsInline
            autoPlay
            loop
            muted
            className="w-full h-screen object-cover"
          ></video>
        </div>
        <div className="absolute inset-0 bg-black/50 z-10" />
        <div className="relative z-20 flex flex-col justify-center items-center lg:flex-row lg:items-center lg:justify-between max-w-6xl mx-auto h-full px-6">
          <div className="w-3/4 lg:mr-4 lg:pr-4">
            <img src={nextworldWhite} alt="Logo" className="object-contain" />
          </div>
          <div className="w-100 p-4 lg:p-0 lg:w-3/4 text-center lg:text-right text-white">
            <h1 className="text-7xl lg:text-8xl text-center lg:text-right font-bold mb-4 racing-sans-one-regular fade-in delay-200">
              Next World Collective
            </h1>
            <p className="mb-6 text-xl oswald-400 fade-in delay-400">
              The best place to find your new favorite artist
            </p>
            <Link
              to="/events"
              className="oswald-700 px-6 py-3 bg-purple-950 hover:bg-purple-800 text-white rounded-lg font-semibold transition"
            >
              GET YOUR TICKETS NOW!
            </Link>
          </div>
        </div>
      </section>

      {/* Who Are We */}
      <section className="relative w-screen h-[90vh] lg:h-screen flex flex-col justify-center lg:flex-none overflow-hidden">
        {/* Background image */}
        <img
          src={whoAreWe}
          alt="Who Are We Background"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content */}
        <div className="relative z-10 max-w-screen-xl mx-auto px-6 flex flex-col justify-center lg:flex-row lg:items-center lg:h-full">
          {/* Left column: title + blurb */}
          <FadeInOnScroll>
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-6xl lg:text-9xl md:text-9xl font-bold text-white racing-sans-one-regular">
                Who Are We
              </h2>
              <p className="mt-4 text-4xl text-gray-300 oswald-400">
                We’re a group of
              </p>
            </div>
          </FadeInOnScroll>

          {/* Right column: pillars stacked vertically, pushed further right */}
          <div className="flex-1 mt-10 lg:mt-0 lg:ml-24 flex flex-col items-center lg:items-end space-y-6">
            {["Artists", "Creatives", "Visionaries"].map((label, i) => (
              <FadeInOnScroll key={label} delay={i * 200}>
                <div className="p-6 rounded-lg shadow-lg text-center">
                  <p className="text-5xl lg:text-6xl font-semibold text-white limelight-regular">
                    {label}
                  </p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Made About Us */}
      <ArticlesContainer />

      {/* Contact Us */}
      <ContactForm />
    </div>
  );
};

export default MainPage;
