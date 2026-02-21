import {
  DocsFooter,
  DocsNavBar,
  DocsHeaderWrapper,
  DocsHeaderLeft,
  DocsHeaderRight,
  DocsHeaderSubtitle,
  DocsPageLayout,
  Card,
  CardHeader,
  CardDescription,
  DocsHelpCard
} from "@quantinuum/quantinuum-ui";
import { LifeBuoyIcon, BookIcon } from "lucide-react";
import { QuantinuumLogo } from "./QuantinuumLogo";
import { QLogo } from "./Q";
import { TKETLogo } from "./TKETLogo";
import { GuppyLogo } from "./GuppyLogo";
import { SearchBox } from "@/components/search/SearchBox";


const productsConfig = [
  {name: "Guppy", link: "guppy", description: "A quantum-first programming language", links: [{
    title: 'Get Started',
    link: '/guppy/getting_started.html',
    subtitle: "Learn the basics of the Guppy programming language."
  },
  {
    title: 'Language Guide',
    link: '/guppy/language_guide/language_guide_index.html',
    subtitle: "Explore all of Guppy's features."
  }], logo:  <GuppyLogo className="h-12 w-36"></GuppyLogo>, }, 
  {name: "TKET",link:"tket", logo:<TKETLogo className="h-8 w-32" ></TKETLogo>,  description: `Quantum computing toolkit and optimizing compiler.`, links: [{
    title: 'Get Started with TKET',
    link: '/tket/user-guide/',
    subtitle: "Getting started tutorial showing basic usage of pytket."
  },
  {
    title: 'Documentation for TKET',
    link: '/tket',
    subtitle: "Overview of all TKET documentation including the user guide, API documentation, and developer blog."
  }],  },
]


const helpSectionConfig = {
  columns: [{
    title: "Get in touch for support",
    icon_description: "Support Icon",
    icon: LifeBuoyIcon,
    link: "https://www.quantinuum.com/contact/docs",
    description: "Need help? Fill out our support form here",
   
  }, {
    title: "Publications",
    icon_description: "Publications Icon",
    icon: BookIcon,
    link: "https://www.quantinuum.com/research/research-areas#publications",
    description: "Find our latest research publications here",
  },
]};

export default function Home() {
  return (
    <>
      <DocsNavBar activePath="/" />
      <DocsPageLayout>
        <DocsHeaderWrapper>
          <DocsHeaderLeft>
            <QuantinuumLogo className="-mb-1 w-[18rem] md:w-[32rem] h-10 md:h-16 dark:invert" />
            <DocsHeaderSubtitle className="mb-4">
            Technical Documentation
            </DocsHeaderSubtitle>
            <p className="text-muted-foreground">
            Explore the documentation, tutorials, and knowledge articles for our products and opensource toolkits at the links below.
            </p>
            <div className="mt-6">
              <SearchBox />
            </div>
            
          </DocsHeaderLeft>
          <DocsHeaderRight className="hidden md:flex">
            <QLogo className="w-64 h-64 ml-48"></QLogo>
            
          </DocsHeaderRight>
        </DocsHeaderWrapper>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    
      {productsConfig.map(product => {
        return <Card  className="px-0 md:px-4 py-4" key={product.name}>
          <CardHeader >
            <a  href={product.link} className="transition hover:opacity-50 scale-[75%] md:scale-[100%]">
            {product.logo}
            </a>
            <div className="h-1"></div>
            <CardDescription >{product.description}</CardDescription>
            <div className="h-5"></div>
            <ul className="flex flex-col gap-6">
              {product.links.map(({link,subtitle, title}) => {
                return <li key={title}>
                  <a  className="font-semibold tracking-tight text-blue-600 dark:text-blue-300" href={link}>{title}</a>
                  <p>{subtitle}</p>
                </li>
              })}</ul>
  
          </CardHeader>
        </Card>
      })}
      </section>
      <DocsHelpCard {...helpSectionConfig} />
      <DocsFooter />
      </DocsPageLayout>
    </>
  );
}
