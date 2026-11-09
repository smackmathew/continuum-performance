import Header from './components/Header';
import Hero from './components/Hero';
import Method from './components/Method';
import Programs from './components/Programs';
import Coaches from './components/Coaches';
import Pricing from './components/Pricing';
import Testimonials from './components/Testimonials';
import Faq from './components/Faq';
import Contact from './components/Contact';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-volt-400 focus:px-3 focus:py-2 focus:text-ink-950">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Method />
        <Programs />
        <Coaches />
        <Pricing />
        <Testimonials />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
