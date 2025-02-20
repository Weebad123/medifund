import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
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
  const verifier4Keypair = anchor.web3.Keypair.generate();
  const verifier5Keypair = anchor.web3.Keypair.generate();
  const verifier6Keypair = anchor.web3.Keypair.generate();
  const verifier7Keypair = anchor.web3.Keypair.generate();
  const verifier8Keypair = anchor.web3.Keypair.generate();
  const verifier9Keypair = anchor.web3.Keypair.generate();
  const verifier10Keypair = anchor.web3.Keypair.generate();
  const verifier11Keypair = anchor.web3.Keypair.generate();
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
        verifier4Keypair.publicKey,
        verifier5Keypair.publicKey,
        verifier6Keypair.publicKey,
        verifier7Keypair.publicKey,
        verifier8Keypair.publicKey,
        verifier9Keypair.publicKey,
        verifier10Keypair.publicKey,
        verifier11Keypair.publicKey,
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

  // LET'S WRITE A TEST TO INITIALIZE THE VERIFIERS GLOBAL REGISTRY AND CASE COUNTER
  it("Admin Initializing The Global Registry Of Verifiers And Case ID Counter for Patients Submissions!!!", async () => {
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

    const [caseCounterPDA, caseCounterBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_counter")],
      program.programId
    );

    // let's airdrop some sol to the newAdmin
    await airdropSol(provider, newAdmin.publicKey, 2);

    await program.methods
      .initializeGlobalVerifiersListAndCaseCounter()
      .accounts({
        admin: newAdmin.publicKey,
        //@ts-ignore
        adminAccount: adminPDA,
        verifiersList: verifiersRegistryPDA,
        caseCounter: caseCounterPDA,
      })
      .signers([newAdmin])
      .rpc();

    // Let's Fetch The Global Registry And Make Assertions
    const globalVerifiersListData = await program.account.verifiersList.fetch(
      verifiersRegistryPDA
    );
    console.log(
      "The length of the Verifiers List is: ",
      globalVerifiersListData.allVerifiers.length
    );
    expect(globalVerifiersListData.allVerifiers.length).to.equal(0);

    // Let's Fetch The Global Case Counter and Make Assertions
    const caseCounterData = await program.account.caseCounter.fetch(
      caseCounterPDA
    );
    expect(caseCounterData.currentId.toNumber()).to.equal(0);
    expect(caseCounterData.counterBump).to.equal(caseCounterBump);
  });

  it("Admin Adding 1-5 Verifiers Done Correctly !!!", async () => {
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

    // Let's get the Verifier3 PDA address
    const [verifier3PDA, verifier3Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier3Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier4 PDA address
    const [verifier4PDA, verifier4Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier4Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier5 PDA address
    const [verifier5PDA, verifier5Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier5Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier6 PDA address
    const [verifier6PDA, verifier6Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier6Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier7 PDA address
    const [verifier7PDA, verifier7Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier7Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier8 PDA address
    const [verifier8PDA, verifier8Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier8Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier9 PDA address
    const [verifier9PDA, verifier9Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier9Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier10 PDA address
    const [verifier10PDA, verifier10Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier10Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's get the Verifier11 PDA address
    const [verifier11PDA, verifier11Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier11Keypair.publicKey.toBuffer()],
      program.programId
    );
    // Let's get the Global Registry PDA
    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    // let's airdrop some sol for the newAdmin
    await airdropSol(provider, newAdmin.publicKey, 3);

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

    //  Adding Verifier 3
    await program.methods
      .addOrRemoveVerifier(verifier3Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier3PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Adding Verifier 4
    await program.methods
      .addOrRemoveVerifier(verifier4Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier4PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Adding Verifier 5
    await program.methods
      .addOrRemoveVerifier(verifier5Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier5PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Adding Verifier 6
    await program.methods
      .addOrRemoveVerifier(verifier6Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier6PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();
    /*
    // Adding Verifier 7
    await program.methods
      .addOrRemoveVerifier(verifier7Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier7PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Adding Verifier 8
    await program.methods
      .addOrRemoveVerifier(verifier8Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier8PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Adding Verifier 9
    await program.methods
      .addOrRemoveVerifier(verifier9Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier9PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Adding Verifier 10
    await program.methods
      .addOrRemoveVerifier(verifier10Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier10PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Adding Verifier 11
    await program.methods
      .addOrRemoveVerifier(verifier11Keypair.publicKey, { add: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier11PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();*/
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
    const globalVerifiersListData = await program.account.verifiersList.fetch(
      verifiersRegistryPDA
    );
    console.log(
      "The number of verifiers in the Registry after adding is: ",
      globalVerifiersListData.allVerifiers.length
    );
    expect(globalVerifiersListData.allVerifiers.length).to.equal(6);
  });

  it("Admin Removing Verifier 4 From The Global Registry !!!", async () => {
    // Let's get Verifier 1 PDA address
    const [verifier4PDA, verifier1Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier4Keypair.publicKey.toBuffer()],
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
      .addOrRemoveVerifier(verifier4Keypair.publicKey, { remove: {} })
      .accountsPartial({
        admin: newAdmin.publicKey,
        // @ts-ignore
        adminAccount: adminPDA,
        verifier: verifier4PDA,
        verifiersList: verifiersRegistryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([newAdmin])
      .rpc();

    // Let's make assertions on Global Registry
    const globalVerifiersListData = await program.account.verifiersList.fetch(
      verifiersRegistryPDA
    );
    console.log(
      "The number of verifiers in the Registry after REMOVING verifier 4 is: ",
      globalVerifiersListData.allVerifiers.length
    );
    expect(globalVerifiersListData.allVerifiers.length).to.equal(5);
  });

  it("Unhappy Scenario:  : : Only Admin Can Initialize (Add or Remove) A Verifier !!!!", async () => {
    // Let's set up the Admin and Verifier PDAs
    const [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );
    // New Verifier 3 PDA
    const [verifier4PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier4Keypair.publicKey.toBuffer()],
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
        .addOrRemoveVerifier(verifier4Keypair.publicKey, { add: {} })
        .accounts({
          admin: patient1Keypair.publicKey,
          // @ts-ignore
          adminAccount: adminPDA,
          verifier: verifier4PDA,
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

  it("Patient 1 and 2 and 3 Submit First Medical Case !!! ", async () => {
    // We setting up the respective PDAs
    const [patient1CasePDA, patient1CaseBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("patient"), patient1Keypair.publicKey.toBuffer()],
        program.programId
      );
    const [patient2CasePDA, patient2CaseBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("patient"), patient2Keypair.publicKey.toBuffer()],
        program.programId
      );
    const [patient3CasePDA, patient3CaseBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("patient"), patient3Keypair.publicKey.toBuffer()],
        program.programId
      );
    // Case Counter PDA
    const [caseCounterPDA, caseCounterBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_counter")],
      program.programId
    );
    const caseCounterDataAll = await program.account.caseCounter.fetch(
      caseCounterPDA
    );
    // Case LookUp PDAs for Patient 1 and 2 and 3
    const [caseLookupPDA, caseLookupBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_lookup"), Buffer.from("CASE0001")],
      program.programId
    );

    const [caseLookupPDA2, caseLookupBump2] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_lookup"), Buffer.from("CASE0002")],
      program.programId
    );

    const [caseLookupPDA3, caseLookupBump3] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_lookup"), Buffer.from("CASE0003")],
      program.programId
    );

    // Let Patient 1 Call The submit Cases Instruction
    await program.methods
      .submitCases(
        "suffering from Cystic Fibrosis for 2 years now",
        new BN(20000),
        "www.gmail.com/drive/folders/medical_records.pdf"
      )
      .accounts({
        patient: patient1Keypair.publicKey,
        //@ts-ignore
        patientCase: patient1CasePDA,
        caseCounter: caseCounterPDA,
        caseLookup: caseLookupPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient1Keypair])
      .rpc();

    // Let Patient 2 Call The Submit Cases Instruction
    await program.methods
      .submitCases(
        "suffering from Ehlers-Danlos Syndrome for a year now",
        new BN(50000),
        "www.github.com/motherfucker/medical_records.pdf"
      )
      .accounts({
        patient: patient2Keypair.publicKey,
        //@ts-ignore
        patientCase: patient2CasePDA,
        caseCounter: caseCounterPDA,
        caseLookup: caseLookupPDA2,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient2Keypair])
      .rpc();

    // Let Patient 3 Call The Submit Cases Instruction
    await program.methods
      .submitCases(
        "suffering from Thyroid dysfunction for a year now",
        new BN(100000),
        "www.gmail.com/drive/folders/hospital_treatment_records.pdf"
      )
      .accounts({
        patient: patient3Keypair.publicKey,
        // @ts-ignore
        patientCase: patient3CasePDA,
        caseCounter: caseCounterPDA,
        caseLookup: caseLookupPDA3,
        systemProgram: SystemProgram.programId,
      })
      .signers([patient3Keypair])
      .rpc();

    // Let's get the Patient 1 & 2 & 3 Cases, And Case Counter
    const patient1CaseData = await program.account.patientCase.fetch(
      patient1CasePDA
    );
    const patient2CaseData = await program.account.patientCase.fetch(
      patient2CasePDA
    );
    const patient3CaseData = await program.account.patientCase.fetch(
      patient3CasePDA
    );

    // Let's make The Loggings
    console.log("FOR PATIENT 1 CASE DETAILS");
    console.log("Case ID for Patient 1 is: ", patient1CaseData.caseId);
    console.log(
      "Case Description For Patient 1 is: ",
      patient1CaseData.caseDescription
    );
    console.log(
      "The total Amount Needed For Case 1 Is: ",
      patient1CaseData.totalAmountNeeded.toNumber()
    );
    console.log(
      "The Total Raised Amount For Case 1 Is: ",
      patient1CaseData.totalRaised.toNumber()
    );
    console.log(
      "Patient's 1 Yes Verification Votes is: ",
      patient1CaseData.verificationYesVotes
    );
    console.log(
      "Patient's 1 verification status is: ",
      patient1CaseData.isVerified
    );
    console.log(
      "Patient's 1 No Verification Votes is: ",
      patient1CaseData.verificationNoVotes
    );
    console.log(
      "Link to Patient 1 medical records: Encrypted is, ",
      patient1CaseData.linkToRecords
    );

    // Patient 2 Details
    console.log("FOR PATIENT 2 CASE DETAILS");
    console.log("Case ID for Patient 2 is: ", patient2CaseData.caseId);
    console.log(
      "Case Description For Patient 2 is: ",
      patient2CaseData.caseDescription
    );
    console.log(
      "The total Amount Needed For Case 2 Is: ",
      patient2CaseData.totalAmountNeeded.toNumber()
    );
    console.log(
      "The Total Raised Amount For Case 2 Is: ",
      patient2CaseData.totalRaised.toNumber()
    );
    console.log(
      "Patient's 2 Total Yes Verification Votes is: ",
      patient2CaseData.verificationYesVotes
    );
    console.log(
      "Patient's 2 verification status is: ",
      patient2CaseData.isVerified
    );
    console.log(
      "Patient's 2 No Verification Votes is: ",
      patient2CaseData.verificationNoVotes
    );
    console.log(
      "Encrypted Link to Patient 2 records is: ",
      patient2CaseData.linkToRecords
    );

    //Patient 3 Log Details
    console.log("FOR PATIENT 2 CASE DETAILS");
    console.log("Case ID for Patient 3 is: ", patient3CaseData.caseId);
    console.log(
      "Case Description For Patient 3 is: ",
      patient3CaseData.caseDescription
    );
    console.log(
      "The total Amount Needed For Case 3 Is: ",
      patient3CaseData.totalAmountNeeded.toNumber()
    );
    console.log(
      "The Total Raised Amount For Case 3 Is: ",
      patient3CaseData.totalRaised.toNumber()
    );
    console.log(
      "Patient's 3 Total Yes Verification Votes is: ",
      patient3CaseData.verificationYesVotes
    );
    console.log(
      "Patient's 3 verification status is: ",
      patient3CaseData.isVerified
    );
    console.log(
      "Patient's 3 No Verification Votes is: ",
      patient3CaseData.verificationNoVotes
    );
    console.log(
      "Encrypted Link to Patient 3 records is: ",
      patient3CaseData.linkToRecords
    );

    // Log case Counter
    console.log(
      "The Current Case Counter is: ",
      caseCounterDataAll.currentId.toNumber()
    );

    // Let's Make The Assertions For Patient 1 Here
    expect(patient1CaseData.caseId.toString()).to.eq("CASE0001");
    expect(patient1CaseData.caseDescription.toString()).contains(
      "Cystic Fibrosis"
    );
    expect(patient1CaseData.verificationYesVotes).to.eq(0);
    expect(patient1CaseData.verificationNoVotes).to.eq(0);
    expect(patient1CaseData.isVerified).to.be.false;
    expect(patient1CaseData.totalAmountNeeded.toNumber()).to.eq(20000);
    expect(patient1CaseData.totalRaised.toNumber()).to.eq(0);

    // Let's Make Assertions For Patient 2 Here
    expect(patient2CaseData.caseId.toString()).to.eq("CASE0002");
    expect(patient2CaseData.caseDescription.toString()).contains(
      "Ehlers-Danlos Syndrome"
    );
    expect(patient2CaseData.verificationYesVotes).to.eq(0);
    expect(patient2CaseData.verificationNoVotes).to.eq(0);
    expect(patient2CaseData.isVerified).to.be.false;
    expect(patient2CaseData.totalAmountNeeded.toNumber()).to.eq(50000);
    expect(patient2CaseData.totalRaised.toNumber()).to.eq(0);
  });

  // Testing for Verification On Patient 1 Case
  it("4 Verifiers (1, 2, 3, 5) Verify Patient 1 Case: 5 Total Verifiers Initialized, 3 Votes a YES, and 1 a NO !!!", async () => {
    // Testing for verification Purpose
    const [patient1CasePDA, patient1CaseBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("patient"), patient1Keypair.publicKey.toBuffer()],
        program.programId
      );

    const [patient1EscrowPDA, patient1EscrowBump] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("patient_escrow"),
          Buffer.from("CASE0001"),
          patient1CasePDA.toBuffer(),
        ],
        program.programId
      );

    const [caseCounterPDA, caseCounterBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_counter")],
      program.programId
    );

    const [caseLookupPDA, caseLookupBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_lookup"), Buffer.from("CASE0001")],
      program.programId
    );

    const [verifier1PDA, verifier1Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier1Keypair.publicKey.toBuffer()],
      program.programId
    );

    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    // Let Verifier 1 call the approve
    await program.methods
      .verifyPatient("CASE0001", true)
      .accounts({
        verifier: verifier1Keypair.publicKey,
        //@ts-ignore
        patientCase: patient1CasePDA,
        verifierAccount: verifier1PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient1EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier1Keypair])
      .rpc();

    // Let Verifier 2 call the approve
    const [verifier2PDA, verifier2Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier2Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0001", true)
      .accounts({
        verifier: verifier2Keypair.publicKey,
        //@ts-ignore
        patientCase: patient1CasePDA,
        verifierAccount: verifier2PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient1EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier2Keypair])
      .rpc();

    // Let Verifier 3 and 5 call approve
    const [verifier3PDA, verifier3Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier3Keypair.publicKey.toBuffer()],
      program.programId
    );

    const [verifier5PDA, verifier5Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier5Keypair.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .verifyPatient("CASE0001", false)
      .accounts({
        verifier: verifier3Keypair.publicKey,
        //@ts-ignore
        patientCase: patient1CasePDA,
        verifierAccount: verifier3PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient1EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier3Keypair])
      .rpc();

    await program.methods
      .verifyPatient("CASE0001", true)
      .accounts({
        verifier: verifier5Keypair.publicKey,
        //@ts-ignore
        patientCase: patient1CasePDA,
        verifierAccount: verifier5PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient1EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier5Keypair])
      .rpc();
    // Let's get the Patient 1 Case Data
    const Patient1VerificationData = await program.account.patientCase.fetch(
      patient1CasePDA
    );

    // Let's log and see if vote was captured
    console.log(
      "The total No Verification Votes for Patient 1 is: ",
      Patient1VerificationData.verificationNoVotes
    );

    console.log(
      "The Total Yes Verification Votes for Patient 1 is: ",
      Patient1VerificationData.verificationYesVotes
    );

    console.log(
      "The verification status for Patient 1 is: ",
      Patient1VerificationData.isVerified
    );
  });

  // Testing for Verification On Patient 2 Case
  it("5 Verifiers (1, 2, 3, 5, 6) On Patient 2 Case: 5 Initialized, 3 Votes a YES, and 2 a NO. 70% threshold working!!!", async () => {
    // Testing For Verification Purposes on Patient 2 Case
    const [patient2CasePDA, patient2CaseBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("patient"), patient2Keypair.publicKey.toBuffer()],
        program.programId
      );

    const [patient2EscrowPDA, patient2EscrowBump] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("patient_escrow"),
          Buffer.from("CASE0002"),
          patient2CasePDA.toBuffer(),
        ],
        program.programId
      );

    const [caseCounterPDA, caseCounterBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_counter")],
      program.programId
    );

    const [caseLookupPDA, caseLookupBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_lookup"), Buffer.from("CASE0002")],
      program.programId
    );

    const [verifier1PDA, verifier1Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier1Keypair.publicKey.toBuffer()],
      program.programId
    );

    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    // Verifier 1 call approve with Yes on Patient 2
    await program.methods
      .verifyPatient("CASE0002", true)
      .accounts({
        verifier: verifier1Keypair.publicKey,
        // @ts-ignore
        patientCase: patient2CasePDA,
        verfifierAccount: verifier1PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient2EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier1Keypair])
      .rpc();

    // Verifier 2 Call Approve With No on Patient Case 2
    const [verifier2PDA, verifier2Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier2Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0002", false)
      .accounts({
        verifier: verifier2Keypair.publicKey,
        // @ts-ignore
        patientCase: patient2CasePDA,
        verfifierAccount: verifier2PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient2EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier2Keypair])
      .rpc();

    // Verifier 3 Call Approve With Yes on Patient Case 2
    const [verifier3PDA, verifier3Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier3Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0002", true)
      .accounts({
        verifier: verifier3Keypair.publicKey,
        // @ts-ignore
        patientCase: patient2CasePDA,
        verifierAccount: verifier3PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient2EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier3Keypair])
      .rpc();

    // Verifier 5 Call Approve With No on Patient Case 2
    const [verifier5PDA, verifier5Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier5Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0002", false)
      .accounts({
        verifier: verifier5Keypair.publicKey,
        // @ts-ignore
        patientCase: patient2CasePDA,
        verifierAccount: verifier5PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient2EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier5Keypair])
      .rpc();

    // Verifier 6 Call Approve With Yes On Patient Case 2
    const [verifier6PDA, verifier6Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier6Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0002", true)
      .accounts({
        verifier: verifier6Keypair.publicKey,
        // @ts-ignore
        patientCase: patient2CasePDA,
        verifierAccount: verifier6PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient2EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier6Keypair])
      .rpc();
    // Let's Get Patient 2 Verification Details data
    const patient2VerificationData = await program.account.patientCase.fetch(
      patient2CasePDA
    );

    console.log(
      "The total Yes Votes For Patient Case 2 is: ",
      patient2VerificationData.verificationYesVotes
    );

    console.log(
      "The total No Votes For Patient Case 2 is: ",
      patient2VerificationData.verificationNoVotes
    );

    console.log(
      "The Verification Status For Patient Case 2 is: ",
      patient2VerificationData.isVerified
    );
  });

  it("4 Verifiers (2, 3, 5, 6) On Patient 3 Case: 3 Vote a NO, 1 vote a YES. Checking if Patient Case Account Will Be Indeed Closed", async () => {
    // Let's Get The Patient PDAs
    const [patient3CasePDA, patient3CaseBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("patient"), patient3Keypair.publicKey.toBuffer()],
        program.programId
      );

    const [patient3EscrowPDA, patient3EscrowBump] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("patient_escrow"),
          Buffer.from("CASE0003"),
          patient3CasePDA.toBuffer(),
        ],
        program.programId
      );

    const [caseCounterPDA, caseCounterBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_counter")],
      program.programId
    );

    const [caseLookupPDA, caseLookupBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_lookup"), Buffer.from("CASE0003")],
      program.programId
    );

    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    // Verfier 2 Vote a No on Case 3
    const [verifier2PDA, verifier2Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier2Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0003", false)
      .accounts({
        verifier: verifier2Keypair.publicKey,
        // @ts-ignore
        patientCase: patient3CasePDA,
        verfifierAccount: verifier2PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient3EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier2Keypair])
      .rpc();

    // Verifier 3 Call Approve With Yes on Patient Case 2
    const [verifier3PDA, verifier3Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier3Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0003", false)
      .accounts({
        verifier: verifier3Keypair.publicKey,
        // @ts-ignore
        patientCase: patient3CasePDA,
        verifierAccount: verifier3PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient3EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier3Keypair])
      .rpc();

    // Verifier 5 Call Approve With No on Patient Case 2
    const [verifier5PDA, verifier5Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier5Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0003", false)
      .accounts({
        verifier: verifier5Keypair.publicKey,
        // @ts-ignore
        patientCase: patient3CasePDA,
        verifierAccount: verifier5PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient3EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier5Keypair])
      .rpc();

    // Verifier 6 Call Approve With Yes On Patient Case 2
    const [verifier6PDA, verifier6Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier6Keypair.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .verifyPatient("CASE0003", false)
      .accounts({
        verifier: verifier6Keypair.publicKey,
        // @ts-ignore
        patientCase: patient3CasePDA,
        verifierAccount: verifier6PDA,
        caseLookup: caseLookupPDA,
        verifiersList: verifiersRegistryPDA,
        patientEscrow: patient3EscrowPDA,
        caseCounter: caseCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier6Keypair])
      .rpc();

    const patient3CaseData = await program.account.patientCase.fetch(
      patient3CasePDA
    );
    console.log("PATIENT 3 CASE DATA IS: ", patient3CaseData);
  });

  it(" UNHAPPY SCENARIO::::::::::::::: A Verifier Cannot Vote Twice On A Particular Case", async () => {
    // Verifier 5 Voted On Case 2 In The Prior Test

    const [patient2CasePDA, patient2CaseBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("patient"), patient2Keypair.publicKey.toBuffer()],
        program.programId
      );

    const [patient2EscrowPDA, patient2EscrowBump] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("patient_escrow"),
          Buffer.from("CASE0002"),
          patient2CasePDA.toBuffer(),
        ],
        program.programId
      );

    const [caseCounterPDA, caseCounterBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_counter")],
      program.programId
    );

    const [caseLookupPDA, caseLookupBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_lookup"), Buffer.from("CASE0002")],
      program.programId
    );

    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    const [verifier5PDA, verifier5Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier5Keypair.publicKey.toBuffer()],
      program.programId
    );

    // Let's Ascertain If The Transaction Will Revert If He Attempts to Vote on Case 2 Again
    try {
      await program.methods
        .verifyPatient("CASE0002", true)
        .accounts({
          verifier: verifier5Keypair.publicKey,
          // @ts-ignore
          patientCase: patient2CasePDA,
          verifierAccount: verifier5PDA,
          caseLookup: caseLookupPDA,
          verifiersList: verifiersRegistryPDA,
          patientEscrow: patient2EscrowPDA,
          caseCounter: caseCounterPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([verifier5Keypair])
        .rpc();
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("VerifierAlreadyVoted");
    }
  });

  it("UNHAPPY SCENARIO:::::::::::::::: A Verifier Cannot Vote On An Already Verified Case  ==> Verifier6 Cannot Vote On Case 1, Which is Already Verified", async () => {
    //Verifier 6 Did Not Vote On Case 1 prior to it being verified.
    // Now, He attempts to Vote on Case 1, but will get a transaction revert.
    const [verifier6PDA, verifier6Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier_role"), verifier6Keypair.publicKey.toBuffer()],
      program.programId
    );

    const [patient1CasePDA, patient1CaseBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("patient"), patient1Keypair.publicKey.toBuffer()],
        program.programId
      );

    const [patient1EscrowPDA, patient1EscrowBump] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("patient_escrow"),
          Buffer.from("CASE0001"),
          patient1CasePDA.toBuffer(),
        ],
        program.programId
      );

    const [caseCounterPDA, caseCounterBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_counter")],
      program.programId
    );

    const [caseLookupPDA, caseLookupBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("case_lookup"), Buffer.from("CASE0001")],
      program.programId
    );

    const [verifiersRegistryPDA, verifiersRegistryBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("verifiers_list")],
        program.programId
      );

    try {
      await program.methods
        .verifyPatient("CASE0001", true)
        .accounts({
          verifier: verifier6Keypair.publicKey,
          // @ts-ignore
          patientCase: patient1CasePDA,
          verifierAccount: verifier6PDA,
          caseLookup: caseLookupPDA,
          verifiersList: verifiersRegistryPDA,
          patientEscrow: patient1EscrowPDA,
          caseCounter: caseCounterPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([verifier6Keypair])
        .rpc();
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("CaseAlreadyVerified");
    }
  });
});
