"use client";

import Link from "next/link";
import React from "react";
import {WalletDisconnectButton, WalletMultiButton} from "@solana/wallet-adapter-react-ui";

const Nav = () => {
	return (
		<div className="flex items-center space-x-8">
			<div className={"hidden sm:block"}>
				<Link href={"https://github.com/rayvego/"} className="hover:underline">
					Made with 🫶🏻 by <span className="gradient">Rayvego</span>
				</Link>
			</div>
			<div className={"flex items-center space-x-4"}>
				<WalletMultiButton />
				<WalletDisconnectButton />
			</div>
		</div>
	);
};

export default Nav;