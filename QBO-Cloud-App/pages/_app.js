import '../styles/globals.css'
import Head from 'next/head'

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Knockout CFO AI Dashboard</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>
      <div className="bg-darkblue text-white min-h-screen font-sans overflow-hidden font-['Outfit']">
         {/* Decorative Background Effects */}
         <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
         <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
         
         {/* Primary Application Component */}
         <Component {...pageProps} />
      </div>
    </>
  )
}

export default MyApp
