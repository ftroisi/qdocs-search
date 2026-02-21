"use client";

// custom 404 for product documentation
import {
    DocsFooter,
    DocsNavBar,
    DocsPageLayout,
    DocsHeaderWrapper,
    DocsHeaderLeft,
    DocsHeaderRight,
    DocsHeaderSubtitle,
} from "@quantinuum/quantinuum-ui";
  import Image from "next/image";
  
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QLogo } from "./Q";

export default function NotFoundPage() {
    const router = useRouter()
    const path = usePathname();
    if (path.includes('/h-series/')) {
        const newPath = path.replace('/h-series/', '/systems/');
        console.log(`Redirecting ${path} to ${newPath}`);
        // useEffect(() => {
        document.body.innerHTML = '';
        setTimeout(() => {
            router.push(newPath);
        }, 3000);
        // }, [router, newPath]);
        return null;
    }
    setTimeout(() => {
        router.push("/");
    }, 10000)
    return (
        <>
        <DocsNavBar activePath="/" />
        <DocsPageLayout>
            <DocsHeaderWrapper>
                <DocsHeaderLeft>
                <DocsHeaderSubtitle className="mb-4">
                    <h1><b>404 - Page Not Found</b></h1>
                    <h4>This page will redirect in 10 seconds </h4>
                </DocsHeaderSubtitle>
                <p className="text-muted-foreground">
                    Link: <a href="https://docs.quantinuum.com/">https://docs.quantinuum.com/</a>
                </p>
                </DocsHeaderLeft>
                <DocsHeaderRight className="hidden md:flex">
                <QLogo className="w-64 h-64 ml-48"></QLogo>
                </DocsHeaderRight>
            </DocsHeaderWrapper>
            <DocsFooter />
        </DocsPageLayout>
        </>
    );
}
