import Navbar from '../../components/Navbar'
import Hero from '../../components/Hero'
import HeroStats from '../../components/HeroStats'
import Services from '../../components/Services'
import IncludedExperience from '../../components/IncludedExperience'
import AdditionalsTeaser from '../../components/AdditionalsTeaser'
import Classes from '../../components/Classes'
import Locations from '../../components/Locations'
import HowItWorks from '../../components/HowItWorks'
import Security from '../../components/Security'
import Gallery from '../../components/Gallery'
import Testimonials from '../../components/Testimonials'
import FAQ from '../../components/FAQ'
import CTAFinal from '../../components/CTAFinal'
import Footer from '../../components/Footer'
import WhatsAppFloat from '../../components/WhatsAppFloat'

function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HeroStats />
        <Services />
        <IncludedExperience />
        <AdditionalsTeaser />
        <HowItWorks />
        <Security />
        <Classes />
        <Locations />
        <Gallery />
        <Testimonials />
        <FAQ />
        <CTAFinal />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  )
}

export default Home
