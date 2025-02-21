use anchor_lang::prelude::*;


pub mod instructions;
pub mod states;

use instructions::*;
use states::*;

declare_id!("8r9QQDRiqBqnGiXXAdhsa2acYs35EgH9HMHU2Eb92PTA");

#[program]
pub mod medifund {
    use super::*;

    pub fn initialize_administrator(ctx: Context<AdminConfig>, admin_address: Pubkey) -> Result<()> {

        initialize_admin(ctx, admin_address)?;
        Ok(())
    }


    // Initialize The Global Verifiers Registry List And Case Counter
    pub fn initialize_global_verifiers_list_and_case_counter(ctx: Context<InitializeVerifiersRegistryAndCaseCounter>) -> Result<()> {

        instructions::verifiers_operations::initialize_verifiers_list(ctx)?;

        Ok(())
    }

    //#[access_control(only_admin(&ctx))]
    pub fn add_or_remove_verifier(ctx: Context<VerifierInfo>, verifier: Pubkey, operation_type: VerifierOperationType) -> Result<()> {

        match operation_type {
            VerifierOperationType::Add => {
                instructions::verifiers_operations::add_verifier(ctx, verifier)?;
            },

            VerifierOperationType::Remove => {
                instructions::verifiers_operations::remove_verifier(ctx, verifier)?;
            }
        }
        Ok(())
    }

    // Patient Submit Cases Here
    pub fn submit_cases(ctx: Context<InitializePatientCase>, case_description: String, total_amount_needed: u64, 
        link_to_records: String) -> Result<()> {

        instructions::initialize_patient(ctx, case_description, total_amount_needed, link_to_records)?;
        Ok(())
    }

    // Verifier attempts to approve a patient case
    pub fn verify_patient(ctx: Context<VerifyPatientCase>, case_id: String, is_yes: bool) -> Result<()> {

        instructions::approve_patient_case(ctx, case_id, is_yes)?;

        Ok(())
    }

    // Donors Make Donations To Patient's Escrow Accounts.
    pub fn donate(ctx: Context<Donation>, case_id: String, amount_to_donate: u64) -> Result<()> {

        instructions::donate_funds_to_patient_escrow(ctx, case_id, amount_to_donate)?;

        Ok(())
    }

    pub fn release_funds(ctx: Context<ReleaseFunds>, case_id: String) -> Result<()> {

        instructions::release_funds(ctx, case_id)?;

        Ok(())
    }
}


/* 
fn only_admin(ctx: &Context<VerifierInfo>) -> Result<()> {
// This function checks that there is correct seeds to generate the admin PDA
    let (expected_admin_pda,_) = Pubkey::find_program_address(
        &[b"admin", ctx.accounts.admin.key().as_ref()],
        ctx.program_id
    );

    require!(
        ctx.accounts.admin_account.key() == expected_admin_pda,
        MedifundError::InvalidAdminAccount
    );
    // This checks that the caller is indeed the admin or not.. 
    // THIS WHOLE FUNCTION is equivalent to the constraints on the VerifierInfo Struct.
    require!(
        ctx.accounts.admin.key() ==
        ctx.accounts.admin_account.admin_pubkey.key(),
        MedifundError::OnlyAdmin,
    );
    Ok(())
}
    */



