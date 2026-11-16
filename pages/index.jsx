import Head from 'next/head';
import Script from 'next/script';
import {page} from '../src/template.js';

export default function Home() {
  return <>
    <Head>
      <title>My Summer Car Wiki — Your Finnish Garage Companion</title>
      <meta name="description" content="Build your car. Survive the summer. An unofficial My Summer Car wiki with beginner checklists, build references, and survival advice." />
      <link rel="stylesheet" href="/wiki/style.css" />
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </Head>
    <div dangerouslySetInnerHTML={{__html:page}} />
    <Script src="/wiki/main.js" strategy="afterInteractive" />
  </>;
}
