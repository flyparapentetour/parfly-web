import Navbar from '../../components/Navbar'
import Hero from '../../components/Hero'
import Services from '../../components/Services'
import Classes from '../../components/Classes'
import Locations from '../../components/Locations'
import HowItWorks from '../../components/HowItWorks'
import Gallery from '../../components/Gallery'
import Testimonials from '../../components/Testimonials'
import CTAFinal from '../../components/CTAFinal'
import Footer from '../../components/Footer'
import WhatsAppFloat from '../../components/WhatsAppFloat'

function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Classes />
        <Locations />
        <HowItWorks />
        <Gallery />
        <Testimonials />
        <CTAFinal />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  )
}

export default Home
