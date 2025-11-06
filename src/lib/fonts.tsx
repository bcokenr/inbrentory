import { Kalam, Sometype_Mono, Patrick_Hand_SC, Courier_Prime, Caveat, Roboto, Lato } from "next/font/google";

export const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
});

export const somemono = Sometype_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-somemono",
});

export const patrick = Patrick_Hand_SC({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-patrick",
});

export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-caveat",
});

export const courier = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier",
});

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-roboto",
});

export const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-loto",
});