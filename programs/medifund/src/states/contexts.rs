use anchor_lang::prelude::*;

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
    pub verifiers_list: Account<'info, VerfiersList>,

    pub system_program: Program<'info, System>,
}





/* Context Struct For Initializing The Global Verifiers Registry PDA account */

#[derive(Accounts)]
pub struct InitializeVerifiersRegistry<'info> {
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
    pub verifiers_registry_list: Account<'info, VerfiersList>,

    pub system_program: Program<'info, System>,
}


