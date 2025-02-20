use anchor_lang::prelude::*;
//use anchor_lang::solana_program::account_info::Account;

use crate::states::accounts::*;
use crate::states::errors::*;



// THE ADMIN CONFIG STRUCT

#[derive(Accounts)]
#[instruction(admin_address: Pubkey)]
pub struct AdminConfig<'info> {
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 1 + 1,
        seeds = [b"admin", admin_address.key().as_ref()],
        bump
    )]
    pub admin_account: Account<'info, Administrator>,

    #[account(mut)]
    pub initializer: Signer<'info>,

    pub system_program: Program<'info, System>,
}


//There should be only the administrator who can call this function to add the verifier badge to others
#[derive(Accounts)]
#[instruction(verifier_address: Pubkey)]
pub struct VerifierInfo<'info> {
    #[account(
        mut,
        constraint = admin.key() == admin_account.admin_pubkey.key() @ MedifundError::OnlyAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"admin", admin.key().as_ref()],
        bump = admin_account.bump
    )]
    pub admin_account: Account<'info, Administrator>,

    // let's create the Verifier PDA
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + 32 + 1 + 1,
        seeds = [b"verifier_role", verifier_address.key().as_ref()],
        bump,
    )]
    pub verifier: Account<'info, Verifier>,

    // Adding the Global Verifiers List PDA here
    #[account(
        mut,
        seeds = [b"verifiers_list"],
        bump = verifiers_list.verifier_registry_bump,
    )]
    pub verifiers_list: Account<'info, VerifiersList>,

    pub system_program: Program<'info, System>,
}





/* Context Struct For Initializing The Global Verifiers Registry PDA account */

#[derive(Accounts)]
pub struct InitializeVerifiersRegistryAndCaseCounter<'info> {
    #[account(
        mut,
        constraint = admin.key() == admin_account.admin_pubkey.key() @ MedifundError::OnlyAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"admin", admin.key().as_ref()],
        bump = admin_account.bump
    )]
    pub admin_account: Account<'info, Administrator>,

    #[account(
        init,
        payer = admin,
        seeds = [b"verifiers_list"],
        bump,
        space = 8 + 4 + (32 * 100) + 1,
    )]
    pub verifiers_registry_list: Account<'info, VerifiersList>,

    // Case Counter PDA here
    #[account(
        init,
        payer = admin,
        seeds = [b"case_counter"],
        bump,
        space = 8 + 8 + 1,
    )]
    pub case_counter: Account<'info, CaseCounter>,

    pub system_program: Program<'info, System>,
}

// INITIALIZE PATIENT CASE context
#[derive(Accounts)]
pub struct InitializePatientCase<'info> {
    // Signer is patient
    #[account(mut)]
    pub patient: Signer<'info>,

    #[account(
        init,
        payer = patient,
        space = 8 + PatientCase::INIT_SPACE,
        seeds = [b"patient", patient.key().as_ref()],
        bump
    )]
    pub patient_case: Account<'info, PatientCase>,

    // let's bring the Case Counter PDA here
    #[account(
        mut,
        seeds = [b"case_counter"],
        bump = case_counter.counter_bump,
    )]
    pub case_counter: Account<'info, CaseCounter>,

    // Let's Bring Up The Case ID Lookup PDA here
    #[account(
        init,
        payer = patient,
        space = 8 + CaseIDLookup::INIT_SPACE,
        seeds = [b"case_lookup",
        format!("CASE{:04}", case_counter.current_id + 1).as_bytes()],
        bump
    )]
    pub case_lookup: Account<'info, CaseIDLookup>,

    pub system_program: Program<'info, System>,
}

// INITIALIZE THE VERIFICATION INSTRUCTION
#[derive(Accounts)]
#[instruction(case_id: String)]
pub struct VerifyPatientCase<'info> {
    #[account(
        mut,
        constraint = verifier.key() == verifier_account.verifier_key.key() @ MedifundError::OnlyVerifier,
    )]
    pub verifier: Signer<'info>,

    #[account(
        mut,
        seeds = [b"verifier_role", verifier.key().as_ref()],
        bump = verifier_account.verifier_bump
    )]
    pub verifier_account: Account<'info, Verifier>,

    // I think i should add the global verifiers registry so that i can query it for the total votes cast
    #[account(
        mut,
        seeds = [b"verifiers_list"],
        bump = verifiers_list.verifier_registry_bump,
    )]
    pub verifiers_list: Account<'info, VerifiersList>,

    // Let's get the Case Lookup PDA using the specified case ID of the original format, CASE####
    #[account(
        mut,
        seeds = [b"case_lookup", case_id.as_bytes()],
        bump = case_lookup.case_lookup_bump,
        constraint = case_lookup.case_id_in_lookup == case_id @MedifundError::InvalidCaseID,
    )]
    pub case_lookup: Account<'info, CaseIDLookup>,

    #[account(
        mut,
        //close = verifier,
        seeds = [b"patient", case_lookup.patient_address.as_ref()],
        bump = patient_case.patient_case_bump,
        constraint = patient_case.key() == case_lookup.patient_pda.key() @ MedifundError::InvalidCaseID,
        constraint = patient_case.case_id == case_id @ MedifundError::InvalidCaseID,
    )]
    pub patient_case: Account<'info, PatientCase>,

    /// CHECKED: This account does not exist yet, and may be created upon successful verification
    #[account(mut)]
    pub patient_escrow: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
