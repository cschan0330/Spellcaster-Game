import Head from 'next/head';
import Script from 'next/script';

export async function getStaticProps() {
  const {readFileSync}=await import('node:fs');
  const {join}=await import('node:path');
  const html=readFileSync(join(process.cwd(),'mnist/index.html'),'utf8');
  const markup=html.match(/<body>([\s\S]*)<script type="module"/)[1];
  return {props:{markup}};
}

export default function MNIST({markup}) {
  return <>
    <Head>
      <title>Digit Lab — MNIST recognition</title>
      <meta name="description" content="Draw a handwritten digit and watch a trained MNIST neural network recognize it, entirely in your browser." />
      <meta name="theme-color" content="#101311" />
      <link rel="stylesheet" href="/mnist/style.css" />
    </Head>
    <div dangerouslySetInnerHTML={{__html:markup}} />
    <Script src="/mnist/app.js" type="module" strategy="afterInteractive" />
  </>;
}
