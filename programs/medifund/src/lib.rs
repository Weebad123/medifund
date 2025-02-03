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


    // Initialize The Global Verifiers Registry List
    pub fn initialize_global_verifiers_list(ctx: Context<InitializeVerifiersRegistry>) -> Result<()> {

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



