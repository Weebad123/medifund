import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Medifund } from "../target/types/medifund";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { assert, expect } from "chai";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

describe("medifund", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.Medifund as Program<Medifund>;

  /* Let's set up the actors in the system */
  const mediAdmin = provider.wallet; // 5 SOL to pay transaction fees
  const newAdmin = anchor.web3.Keypair.generate();
  const verifier1Keypair = anchor.web3.Keypair.generate(); // 2 SOL
  const verifier2Keypair = anchor.web3.Keypair.generate();
  const verifier3Keypair = anchor.web3.Keypair.generate();
  const donor1Keypair = anchor.web3.Keypair.generate(); // 10 SOL
  const donor2Keypair = anchor.web3.Keypair.generate(); // 10 SOL
  const donor3Keypair = anchor.web3.Keypair.generate(); // 10 SOL
  const patient1Keypair = anchor.web3.Keypair.generate(); // 2 SOL
  const patient2Keypair = anchor.web3.Keypair.generate(); // 2 SOL
  const patient3Keypair = anchor.web3.Keypair.generate(); // 2 SOL

  /* Let's write the Airdrop function below */
  async function airdropSol(provider, publicKey, amountSol) {
    const airdropSig = await provider.connection.requestAirdrop(
      publicKey,
      amountSol * anchor.web3.LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction(airdropSig);
  }

  /* Let's set up the actors in our system for airdrop*/

  async function setupActors(provider, users, amount) {
    for (const user of users) {
      await airdropSol(provider, user, amount);
    }
  }

  /* Let's start the actual airdrop*/
  before(async () => {
    // Giving Administrator 5 SOL
    await airdropSol(provider, mediAdmin.publicKey, 5);
    // Set up Donors with 10 SOL
    await setupActors(
      provider,
      [
        donor1Keypair.publicKey,
        donor2Keypair.publicKey,
        donor3Keypair.publicKey,
      ],
      10
    );
    // Set up Verifier and Patients with 2 SOL
    await setupActors(
      provider,
      [
        verifier1Keypair.publicKey,
        verifier2Keypair.publicKey,
        verifier3Keypair.publicKey,
        patient1Keypair.publicKey,
        patient2Keypair.publicKey,
        patient3Keypair.publicKey,
      ],
      2
    );
  });

  it("Admin Initialization Done Correctly !!!", async () => {
    // Add your test here.
    // Let's get the Admin PDA
    const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .initializeAdministrator(newAdmin.publicKey)
      .accountsPartial({
        initializer: mediAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
      })
      .signers([])
      .rpc();

    // Let's make Some Assertions to Ascertain that The new Admin is Really Set
    const adminDetails = await program.account.administrator.fetch(adminPDA);
    expect(adminDetails.adminPubkey.toBuffer()).to.deep.equal(
      newAdmin.publicKey.toBuffer()
    ); // Or you can compare the base58 encoded string instead.
    expect(adminDetails.adminPubkey.equals(newAdmin.publicKey)).to.be.true;
    expect(adminDetails.isActive).to.be.true;
    expect(adminDetails.bump).to.eq(adminBump);
  });

  // LET'S WRITE A TEST TO INITIALIZE THE VERIFIERS GLOBAL REGISTRY
  it("Admin Initializing The Global Registry Of Verifiers!!!", async () => {
    //

    const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );

    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    // let's airdrop some sol to the newAdmin
    await airdropSol(provider, newAdmin.publicKey, 2);

    await program.methods
      .initializeGlobalVerifiersList()
      .accounts({
        admin: newAdmin.publicKey,
        //@ts-ignore
        adminAccount: adminPDA,
        verifiersList: verifiersRegistryPDA,
      })
      .signers([newAdmin])
      .rpc();

    // Let's Fetch The Global Registry And Make Assertions
    const globalVerifiersListData = await program.account.verfiersList.fetch(
      verifiersRegistryPDA
    );
    console.log(
      "The length of the Verifiers List is: ",
      globalVerifiersListData.allVerifiers.length
    );
    expect(globalVerifiersListData.allVerifiers.length).to.equal(0);
  });

  it("Admin Adding 2 Verifiers Done Correctly !!!", async () => {
    // Let's initialize admin account here:
    const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verfier1 PDA address
    const [verifier1PDA, verifier1Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier1Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier2 PDA address
    const [verifier2PDA, verifier2Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier2Keypair.publicKey.toBuffer()],
      program.programId
    );
    // Let's get the Global Registry PDA
    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    // let's airdrop some sol for the newAdmin
    await airdropSol(provider, newAdmin.publicKey, 2);

    // Adding Verifier 1
    await program.methods
      .addOrRemoveVerifier(verifier1Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier1PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Adding Verifier 2
    await program.methods
      .addOrRemoveVerifier(verifier2Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier2PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();
    // Asserting Verifier 1 Data Initialized correctly
    const verifier1Details = await program.account.verifier.fetch(verifier1PDA);
    expect(verifier1Details.verifierKey.toBuffer()).deep.equal(
      verifier1Keypair.publicKey.toBuffer()
    );
    expect(verifier1Details.isVerifier).to.be.true;
    expect(verifier1Details.verifierBump).to.eq(verifier1Bump);

    // Asserting Verifier 2 Data Initialized correctly
    const verifier2Details = await program.account.verifier.fetch(verifier2PDA);
    expect(verifier2Details.verifierKey.toBuffer()).deep.equal(
      verifier2Keypair.publicKey.toBuffer()
    );
    expect(verifier2Details.isVerifier).to.be.true;
    expect(verifier2Details.verifierBump).to.eq(verifier2Bump);
    // Asserting Global Verifiers Registry Is Non-zero After Adding Verifier
    const globalVerifiersListData = await program.account.verfiersList.fetch(
      verifiersRegistryPDA
    );
    console.log(
      "The number of verifiers in the Registry after adding is: ",
      globalVerifiersListData.allVerifiers.length
    );
    expect(globalVerifiersListData.allVerifiers.length).to.equal(2);
  });

  it("Admin Removing Verifier 1 From The Global Registry !!!", async () => {
    // Let's get Verifier 1 PDA address
    const [verifier1PDA, verifier1Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier1Keypair.publicKey.toBuffer()],
      program.programId
    );
    // Let's get Admin PDA address
    const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );
    // Let's get The Global Registry PDA address
    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    // let's airdrip some sol
    await airdropSol(provider, newAdmin.publicKey, 2);

    await program.methods
      .addOrRemoveVerifier(verifier1Keypair.publicKey, { remove: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier1PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Let's make assertions on Global Registry
    const globalVerifiersListData = await program.account.verfiersList.fetch(
      verifiersRegistryPDA
    );
    console.log(
      "The number of verifiers in the Registry after REMOVING verifier 1 is: ",
      globalVerifiersListData.allVerifiers.length
    );
    expect(globalVerifiersListData.allVerifiers.length).to.equal(1);
  });

  it("Unhappy Scenario:  : : Only Admin Can Initialize A Verifier !!!!", async () => {
    // Let's set up the Admin and Verifier PDAs
    const [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );
    // New Verifier 3 PDA
    const [verifier3PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier3Keypair.publicKey.toBuffer()],
      program.programId
    );

    // VerifiersList PDA
    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    // We will try to call the initialize verifier from a different account
    try {
      // Let's call the initialize verifier instruction
      await program.methods
        .addOrRemoveVerifier(verifier3Keypair.publicKey, { add: {} })
        .accounts({
          admin: patient1Keypair.publicKey,
          // @ts-ignore
          adminAccount: adminPDA,
          verifier: verifier3PDA,
          verifiersList: verifiersRegistryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([patient1Keypair])
        .rpc();
    } catch (err: any) {
      //console.log("Detailed Errors is: ", err);
      expect(err.error.errorCode.code).to.equal("OnlyAdmin");
    }
  });
});
