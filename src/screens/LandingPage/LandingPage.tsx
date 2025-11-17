import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

const Arrow: React.FC<{
  direction: 'right' | 'down' | 'up' | 'left' | 'down-right';
  className?: string;
}> = ({ direction, className = '' }) => {
  const pathsByDirection = {
    right: 'M0 12 L30 12 L25 7 M30 12 L25 17',
    down: 'M12 0 L12 30 L7 25 M12 30 L17 25',
    up: 'M12 30 L12 0 L7 5 M12 0 L17 5',
    left: 'M30 12 L0 12 L5 7 M0 12 L5 17',
    'down-right': 'M0 0 Q15 15 30 30 L25 28 M30 30 L28 25',
  };

  return (
    <svg
      className={`stroke-[#13192a] ${className}`}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={pathsByDirection[direction]} />
    </svg>
  );
};

const featureCards = [
  {
    title: "Visual Flow Design",
    description:
      "Drag-and-drop logic blocks to design your program flow. No code needed to start thinking algorithmically.",
    bgColor: "bg-[#e876ff]",
    icon: "/fi-br-vector-alt.svg",
  },
  {
    title: "AI Code Generation",
    description:
      "Transform your pseudo code and flowcharts into production-ready code instantly with intelligent AI assistance.",
    bgColor: "bg-[#efff76]",
    icon: "/fi-br-head-side-thinking.svg",
  },
  {
    title: "Open Source Friendly",
    description: "To be discussed.....",
    bgColor: "bg-[#ff7676]",
    icon: "/fi-br-globe.svg",
    titleHighlight: true,
  },
];
const steps = [
  {
    number: "#1",
    title: "Design your logic visually",
    description:
      "Start by creating flowcharts and pseudocode using our intuitive visual editor. Think through your algorithm step by step.",
    image: "/image-1.png",
    icon: "/fi-sr-cursor.svg",
    numberLeft: "left-12",
    numberTop: "top-[1612px]",
    titleLeft: "left-[127px]",
    titleTop: "top-[1594px]",
    descLeft: "left-[127px]",
    descTop: "top-[1632px]",
    imageLeft: "left-[720px]",
    imageTop: "top-[1457px]",
    iconLeft: "left-[978px]",
    iconTop: "top-[1523px]",
  },
  {
    number: "#2",
    title: "Let AI create a plan & generate code",
    description:
      "Our AI analyzes your visual design and generates clean, production-ready code in your preferred language.",
    image: "/image-2.png",
    icon: null,
    numberLeft: "left-[734px]",
    numberTop: "top-[2141px]",
    titleLeft: "left-[813px]",
    titleTop: "top-[2123px]",
    descLeft: "left-[813px]",
    descTop: "top-[2161px]",
    imageLeft: "left-12",
    imageTop: "top-[1986px]",
    iconLeft: null,
    iconTop: null,
  },
  {
    number: "#3",
    title: "Export, build, and refine",
    description:
      "Download your code, integrate it into your project, and iterate. Soodo Code learns from your style.",
    image: "/image-3.png",
    icon: "/fi-sr-cursor.svg",
    numberLeft: "left-12",
    numberTop: "top-[2670px]",
    titleLeft: "left-[127px]",
    titleTop: "top-[2652px]",
    descLeft: "left-[127px]",
    descTop: "top-[2690px]",
    imageLeft: "left-[720px]",
    imageTop: "top-[2511px]",
    iconLeft: "left-[1300px]",
    iconTop: "top-[2664px]",
  },
];


export const LandingPage = (): JSX.Element => {
  const navigate = useNavigate();

  const handleTryToday = () => {
    navigate('/app');
  };

  return (
    <div className="soodo-alice-bg w-full min-h-screen relative overflow-x-hidden">

      {/* Hero */}
      <section id="about" className="relative pt-32 pb-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 bg-[#b6ff76] rounded-full border-4 md:border-[7px] border-[#13192a] px-6 md:px-8 py-3 md:py-4">
              <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-2xl md:text-4xl whitespace-nowrap">
                VISUALLY
              </span>
              <img className="w-6 h-6 md:w-8 md:h-8" alt="Forward" src="/fi-br-forward.svg" />
            </div>

            <Arrow direction="right" className="hidden md:block" />

            <div className="flex items-center gap-3 bg-[#efff76] rounded-3xl border-4 md:border-[7px] border-[#13192a] px-6 md:px-8 py-3 md:py-4">
              <div className="w-5 h-6 bg-[url(/vector-2.svg)] bg-[100%_100%]" />
              <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-2xl md:text-4xl">
                SPEAK
              </span>
            </div>
          </div>

          <Arrow direction="down" className="md:hidden" />

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 bg-[#e876ff] rounded-3xl border-4 md:border-[7px] border-[#13192a] px-6 md:px-8 py-3 md:py-4">
              <img className="w-6 h-6" alt="Indent" src="/fi-br-indent.svg" />
              <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-2xl md:text-4xl">
                WHAT
              </span>
            </div>

            <Arrow direction="right" className="hidden md:block" />

            <div className="flex items-center gap-3 bg-[#f6cbff] rounded-3xl border-4 md:border-[7px] border-[#13192a] px-6 md:px-8 py-3 md:py-4">
              <img className="w-6 h-6" alt="Indent" src="/fi-br-indent.svg" />
              <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-2xl md:text-4xl">
                YOU
              </span>
            </div>
          </div>

          <Arrow direction="down" />

          <div className="flex items-center gap-3 bg-[#ff7676] rounded-full border-4 md:border-[7px] border-[#13192a] px-6 md:px-8 py-3 md:py-4">
            <div className="w-8 h-8 bg-[url(/vector.svg)] bg-[100%_100%]" />
            <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-2xl md:text-4xl">
              WANT.
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="[font-family:'Space_Mono',Helvetica] font-bold text-black text-2xl md:text-4xl">
            with
          </div>
          <div className="flex items-center gap-4">
            <img className="w-24 md:w-[138px] h-6 md:h-[33px]" alt="Soodo" src="/vector-1.svg" />
            <img className="w-20 md:w-[104px] h-6 md:h-[33px]" alt="Code" src="/-code.svg" />
          </div>
        </div>

        <div className="flex justify-center mt-12">
          <Button onClick={handleTryToday} className="flex items-center gap-3 bg-[#b6ff76] hover:bg-[#a5ee65] rounded-full border-4 md:border-[7px] border-[#13192a] px-8 md:px-12 py-4 md:py-6 h-auto cursor-pointer transition-colors">
            <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-xl md:text-3xl">
              Try Today!
            </span>
            <img className="w-6 h-6 md:w-8 md:h-8" alt="Forward" src="/fi-br-forward.svg" />
          </Button>
        </div>
      </section>

      <nav className="fixed top-4 left-4 right-4 md:left-8 md:right-auto md:w-auto z-50 bg-[#ffffffcc] rounded-3xl border border-solid border-[#a0a0a08c] shadow-[0px_4px_62.3px_#0000002b] backdrop-blur-[2px]">
        <div className="flex items-center gap-4 md:gap-6 px-4 py-3">
          <img className="w-10 h-10 md:w-12 md:h-12" alt="Logo" src="/group-29.png" />

          <div className="hidden md:flex items-center gap-6">
            <a href="#about" className="[font-family:'Space_Mono',Helvetica] font-normal text-[#13192ab2] text-lg md:text-xl hover:text-[#13192a] transition-colors">
              About
            </a>
            <a href="#features" className="[font-family:'Space_Mono',Helvetica] font-normal text-[#13192ab2] text-lg md:text-xl hover:text-[#13192a] transition-colors">
              Features
            </a>
            <a href="#contact" className="[font-family:'Space_Mono',Helvetica] font-normal text-[#13192ab2] text-lg md:text-xl hover:text-[#13192a] transition-colors">
              Contact
            </a>
          </div>

          <Button
            onClick={handleTryToday}
            variant="outline"
            className="ml-auto bg-[#dcffba] hover:bg-[#cbee99] rounded-full border-2 md:border-[3px] border-[#13192a] px-4 md:px-6 py-2 h-auto cursor-pointer transition-colors"
          >
            <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-xs md:text-sm">
              Login
            </span>
            <img className="w-4 h-4 ml-2" alt="Forward" src="/fi-br-forward.svg" />
          </Button>
        </div>
      </nav>

      <section id="features" className="px-4 md:px-8 lg:px-16 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {featureCards.map((card, index) => (
            <Card
              key={`feature-${index}`}
              className={`${card.bgColor} rounded-3xl border-4 md:border-[7px] border-[#13192a] overflow-hidden`}
            >
              <CardContent className="p-6 md:p-8 flex flex-col items-center gap-6 min-h-[280px] md:min-h-[339px]">
                <img className="w-10 h-10 md:w-12 md:h-12" alt={card.title} src={card.icon} />
                <h3 className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-2xl md:text-4xl text-center">
                  {card.titleHighlight ? (
                    <>
                      <span className="text-white">Open Source</span>
                      <span className="text-[#13192a]"> Friendly</span>
                    </>
                  ) : (
                    card.title
                  )}
                </h3>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#13192a] text-lg md:text-2xl text-center">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-8 lg:px-16 py-16 max-w-7xl mx-auto">
        <h2 className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-4xl md:text-5xl lg:text-6xl text-center mb-16">
          How does it work?
        </h2>

        <div className="space-y-16 md:space-y-24">
          {steps.map((step, index) => (
            <div
              key={`step-${index}`}
              className={`flex flex-col ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } gap-8 md:gap-12 items-center`}
            >
              <div className="flex-1 space-y-4">
                <div className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-3xl md:text-5xl">
                  {step.number}
                </div>
                <h3 className="[font-family:'Space_Mono',Helvetica] font-bold text-black text-xl md:text-2xl">
                  {step.title}
                </h3>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-black text-base md:text-xl">
                  {step.description}
                </p>
                {step.icon && (
                  <img className="w-10 h-10 md:w-12 md:h-12" alt="Cursor" src={step.icon} />
                )}
              </div>

              {index % 2 === 0 ? (
                <Arrow direction="right" className="hidden lg:block" />
              ) : (
                <Arrow direction="left" className="hidden lg:block" />
              )}
              <Arrow direction="down" className="lg:hidden" />

              <div className="flex-1">
                <img
                  className="w-full h-auto rounded-3xl border-4 md:border-[7px] border-[#13192a33] shadow-lg"
                  alt={`Step ${step.number}`}
                  src={step.image}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="px-4 md:px-8 lg:px-16 py-20 max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <Button onClick={handleTryToday} className="flex items-center gap-3 bg-[#b6ff76] hover:bg-[#a5ee65] rounded-full border-4 md:border-[7px] border-[#13192a] px-8 md:px-12 py-4 md:py-6 h-auto cursor-pointer transition-colors">
            <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-xl md:text-3xl">
              TRY
            </span>
            <img className="w-6 h-6 md:w-8 md:h-8" alt="Forward" src="/fi-br-forward.svg" />
          </Button>

            <Arrow direction="down" className="md:hidden" />

            <div className="flex items-center gap-3 bg-[#ff7676] rounded-full border-4 md:border-[7px] border-[#13192a] px-8 md:px-12 py-4 md:py-6">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-[url(/vector.svg)] bg-[100%_100%]" />
              <span className="[font-family:'Space_Mono',Helvetica] font-bold text-[#13192a] text-2xl md:text-4xl">
                TODAY.
              </span>
            </div>
          </div>

          <div className="[-webkit-text-stroke:2px_#000000] md:[-webkit-text-stroke:3px_#000000] [font-family:'Space_Mono',Helvetica] font-bold text-[#2dc0ff] text-xl md:text-2xl text-center mt-8">
            Contact Us!
          </div>

          <div className="flex items-center gap-4">
            <img className="w-24 md:w-[138px] h-6 md:h-[33px]" alt="Soodo" src="/vector-1.svg" />
            <img className="w-20 md:w-[104px] h-6 md:h-[33px]" alt="Code" src="/-code.svg" />
          </div>
        </div>
      </section>
    </div>
  );
};
