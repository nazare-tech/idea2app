import Image from "next/image"

const heroLayers = [
  {
    src: "/landing/hero/215-098_image-27.png",
    width: 297,
    height: 315,
    className: "left-[-8px] top-[202px] h-[315px] w-[297px]",
  },
  {
    src: "/landing/hero/215-099_image-28.png",
    width: 426,
    height: 318,
    className: "left-[60px] top-[33px] h-[318px] w-[426px]",
  },
  {
    src: "/landing/hero/215-100_image-23.png",
    width: 329,
    height: 390,
    className: "left-[211px] top-[355px] h-[390px] w-[329px]",
  },
  {
    src: "/landing/hero/215-101_image-26.png",
    width: 227,
    height: 239,
    className: "left-[234px] top-[242px] h-[239px] w-[227px]",
  },
  {
    src: "/landing/hero/215-102_image-25.png",
    width: 116,
    height: 323,
    className: "left-[-45px] top-[316px] h-[323px] w-[116px]",
  },
  {
    src: "/landing/hero/215-103_image-24.png",
    width: 175,
    height: 272,
    className: "left-[88px] top-[377px] h-[272px] w-[175px]",
  },
  {
    src: "/landing/hero/215-104_image-21.png",
    width: 310,
    height: 276,
    className: "left-[7px] top-[562px] h-[276px] w-[310px]",
  },
  {
    src: "/landing/hero/215-105_image-20.png",
    width: 204,
    height: 237,
    className: "left-[234px] top-[587px] h-[237px] w-[204px]",
  },
  {
    src: "/landing/hero/215-106_image-22.png",
    width: 177,
    height: 167,
    className: "left-[388px] top-[483px] h-[167px] w-[177px]",
  },
  {
    src: "/landing/hero/215-107_image-21.png",
    width: 345,
    height: 287,
    className: "left-[1579px] top-[523px] h-[287px] w-[345px]",
  },
  {
    src: "/landing/hero/215-108_image-22.png",
    width: 223,
    height: 248,
    className: "left-[1419px] top-[513px] h-[248px] w-[223px]",
  },
  {
    src: "/landing/hero/215-109_image-27.png",
    width: 411,
    height: 330,
    className: "left-[1466px] top-[79px] h-[330px] w-[411px]",
  },
  {
    src: "/landing/hero/215-110_image-26.png",
    width: 216,
    height: 215,
    className: "left-[1708px] top-[21px] h-[215px] w-[216px]",
  },
  {
    src: "/landing/hero/215-111_image-24.png",
    width: 199,
    height: 311,
    className: "left-[1725px] top-[217px] h-[311px] w-[199px]",
  },
  {
    src: "/landing/hero/215-112_image-23.png",
    width: 267,
    height: 311,
    className: "left-[1374px] top-[247px] h-[311px] w-[267px]",
  },
  {
    src: "/landing/hero/215-113_image-25.png",
    width: 267,
    height: 257,
    className: "left-[1589px] top-[383px] h-[257px] w-[267px]",
  },
]

export function HeroArtwork() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[838px] w-[1920px] -translate-x-1/2 -translate-y-1/2 overflow-hidden lg:block"
    >
      {heroLayers.map((layer) => (
        <Image
          key={layer.src}
          src={layer.src}
          width={layer.width}
          height={layer.height}
          alt=""
          className={`absolute object-contain ${layer.className}`}
          loading="eager"
          decoding="async"
          unoptimized
        />
      ))}
    </div>
  )
}
