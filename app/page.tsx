"use client"
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction, createMintToInstruction,
  ExtensionType, getMintLen,
  getAssociatedTokenAddress,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pack } from "@solana/spl-token-metadata";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import {revalidatePath} from "next/cache";

const formSchema = z.object({
  name: z.string().min(1, "Token name is required"),
  symbol: z.string().min(1, "Token symbol is required").max(10, "Symbol must be 10 characters or less"),
  uri: z.string().url("Invalid metadata URI"),
  mintAmount: z.number().min(1, "Mint amount must be at least 1"),
  decimals: z.number().min(0, "Decimals must be at least 0"),
});

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [mintPublicKey, setMintPublicKey] = useState("")
  const [solscanLink, setSolscanLink] = useState("")

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      symbol: "",
      uri: "https://cdn.100xdevs.com/metadata.json",
      mintAmount: 1000,
      decimals: 0,
    },
  });

  const createToken = async (values) => {
    if (!wallet.publicKey) {
      console.error('Wallet not connected');
      return;
    }

    setLoading(true);
    const mintKeypair = Keypair.generate();
    const metadata = {
      mint: mintKeypair.publicKey,
      name: values.name,
      symbol: values.symbol,
      uri: values.uri,
      additionalMetadata: [],
    };
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
        createInitializeMintInstruction(mintKeypair.publicKey, values.decimals, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          mint: mintKeypair.publicKey,
          metadata: mintKeypair.publicKey,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          mintAuthority: wallet.publicKey,
          updateAuthority: wallet.publicKey,
        }),
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          associatedTokenAddress,
          wallet.publicKey,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );

      const mintAmount = values.mintAmount * (10 ** values.decimals); // Convert to smallest units (9 decimals)
      transaction.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAddress,
          wallet.publicKey,
          mintAmount,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.partialSign(mintKeypair);

      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Token created and minted:', mintKeypair.publicKey.toBase58());
      console.log('Associated Token Account:', associatedTokenAddress.toBase58());

      setMintPublicKey(mintKeypair.publicKey.toBase58());
      // find the token on solscan devnet
      setSolscanLink(`https://solscan.io/token/${mintPublicKey}?cluster=devnet`);
      revalidatePath("/")
    } catch (error) {
      console.error('Error creating and minting token:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={"home"}>
      <div className={"home-content"}>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Your Token on the Solana Blockchain (Devnet)</CardTitle>
            <CardDescription>Enter the details for your new token on Solana.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(createToken)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Token" {...field} />
                      </FormControl>
                      <FormDescription>The name of your token.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="MTK" {...field} />
                      </FormControl>
                      <FormDescription>A short symbol for your token (max 10 characters).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metadata URI</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/token-metadata.json" {...field} />
                      </FormControl>
                      <FormDescription>The URI for your token's metadata.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="decimals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimals </FormLabel>
                      <FormControl>
                        <Input placeholder="9" {...field} type={"number"} onChange={e => field.onChange(parseInt(e.target.value))}/>
                      </FormControl>
                      <FormDescription>Numeric value that specifies the number of decimal places that the token can have.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mintAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Mint Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormDescription>The number of tokens to mint initially.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={!wallet.publicKey || loading}>
                  {loading ? 'Creating Token...' : 'Create Token'}
                </Button>
                <div>{mintPublicKey && (
                  <>
                    <div className="text-xl">Token created and minted: {mintPublicKey}</div>
                    <Link href={solscanLink} className={"text-xl text-blue-500 hover:underline"}>Verify on solscan.io</Link>
                  </>
                )}</div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}