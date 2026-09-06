import { Navbar } from '@/components/placeo/navbar'
import { Hero } from '@/components/placeo/hero'
import { Features } from '@/components/placeo/features'
import { Stats } from '@/components/placeo/stats'
import { Testimonials } from '@/components/placeo/testimonials'
import { Faq } from '@/components/placeo/faq'
import { Footer } from '@/components/placeo/footer'

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Stats />
        <Testimonials />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
