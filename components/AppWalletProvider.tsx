"use client";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function AppWalletProvider({ children }: { children: React.ReactNode }) {
	const network = WalletAdapterNetwork.Devnet;
	const endpoint = "https://devnet.helius-rpc.com/?api-key=6fc0c475-19f6-4e28-a7c6-9c0e72db5df3";
	const wallets = useMemo(() => [], [network]);

	return (
		<ConnectionProvider endpoint={endpoint}>
			<WalletProvider wallets={wallets} autoConnect>
				<WalletModalProvider>{children}</WalletModalProvider>
			</WalletProvider>
		</ConnectionProvider>
	);
}