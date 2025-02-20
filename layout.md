# Accounts

1. Patient Account
   This will store specific information of the patient. Some info may include:
   patient's public key, brief description of genetic disease, amount needed for treatment,
   amount raised so far, the verification status of this patient's case ( indicates whether the Admin
   has verified the patient's claims), is_active ( indicates whether patient case has been submitted),
   and a case ID that assigned to this case upon verification by Admin

2. Admin Account
   This will store key information of the admin including: public key of the admin, and is_active variable indicating
   that the Admin is active.

3. Donation Escrow PDA Account
   This is gonna be a PDA account with the patient's public key and case ID as seeds.
   This will hold the donated funds from donors. Each patient case will have a new Donation
   Escrow PDA account. This account will store information like: case ID, patient's public key,
   total donations made to this specific escrow account, funds released to patient, is_active variable
   that will indicate whether the escrow account is still in use.

# Instructions

1. Initialize Admin instruction: This will set up the administrator account to the platform.

2. Create patient case: Because the platform is decentralized, anybody can create a patient's case.
   This will require inputs like: description of disease, and total amount needed for treatment. Upon
   creating the case, until the administrator verifies the claims of the patients, it's verifications status
   is set to false and te case is not assigned a Case ID yet.

3. verify patient case: The administrator is a trusted entity, and so the platform assumes all verifications are done correctly
   and off-chain. This instruction sets the verification status of the patient case to true, and assigns the case a Case ID after
   off-chain verification mechanisms are done. It then initializes an escrow PDA account for this verified patient's case.

4. Donate Funds: This instruction is where anybody can donate funds to a particular escrow PDA account by specifying the case ID they want
   to contribute funds to. For simplicity, donors will be able to contribute native SOL for now.

5. Release funds: This instruction must be callable only by the Admin. This is where the Admin transfers the contributed native SOL
   to the patient's pub key. If the total needed amount is transferred, the Admin can close this escrow PDA account for this particular
   patient's case. If the toal needed amount is not reached, the Admin will transfer the currently raised amount, and decrement the needed
   amount, and decrement the needed amount with the current raised amount.

6. Get Case IDs: This is gonna be a view instruction only that will help Donors search through all cases by inputting a brief words that attempts to match
   the description of the patient's case, and then the associated case IDs matching the description will pop up. This will enable donors contribute funds to
   special treatment they want to help.

7. Get info about this case ID: this is gonna be a helper view function that will output all relevant info about a patient's case just
   by inputting a case ID. This will help donors know the total amount raised for a particular case, and other relevant info associated with the
   specified case.

# Program Flow

1. A patient submit a case with all the required info

2. An admin verifies all the claims of the patients off-chain, and sets the verification status to true,
   and then assigns this patient case a Case ID. The admin also initializes an escrow PDA account for the patient
   using the patient's public key and the assigned case ID as seeds for the PDA.

3. Donors contribute funds to a specific patient case, and the contributed funds goes straight into the patient's
   escrow PDA account.

4. Upon the Admin's own discretion, the funds is then released to the specified patient's whose escrow PDA account
   has been funded with contributions from Donors.

# Security Considerations

1. Only the Admin should be able to verify a patient case.

2. Only the Admin should be able to release the funds from the patient's escrow PDA accoun to the patient.
