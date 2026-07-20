
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import PricingModal from "./PricingModal";
import { checkUser } from "@/lib/checkUser";
import { PLANS } from "@/lib/constant";
import { Plan } from "@/types/plans";

const Header = async () => {
  const user = await checkUser();
  return (
    <header className="w-full fixed top-0 left-0x z-50 h-16 border-b border-white/6 bg-white/7 backdrop:blur-md">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/">
          <Image alt="AI Builder" src="/mainlogo.png" width={50} height={50} />
        </Link>

        <div className="flex items-center gap-5">
          <Show when="signed-in">
            <Link
              href={"/projects"}
              className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/70"
            >
              Projects
            </Link>

            {
              user && (
                <PricingModal >
              <span className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[13px] font-medium text-white/40 transition-colors hover:bg-white/20 hover:text-white/70">
                <Zap className="h-3 w-3 fill-white/85" />
                {user?.credits} credits
              </span>
            </PricingModal>
              )
            }
            <UserButton />
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal"> 
                <Button variant="ghost" size="sm" className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/70 cursor-pointer">
                    Sign in
                </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="ghost" size="sm" className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/70 cursor-pointer">
                Sign Up
              </Button>
            </SignUpButton>
          </Show>
        </div>
      </nav>
    </header>
  );
};

export default Header;
