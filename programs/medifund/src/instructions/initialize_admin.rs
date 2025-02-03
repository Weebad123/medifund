use anchor_lang::prelude::*;

use crate::states::contexts::*;


// Let's Write Our Admin initialization instruction here
pub fn initialize_admin(ctx: Context<AdminConfig>, admin_address: Pubkey) -> Result<()> {
    // Now, let's get the the accounts
    let admin_configuration = &mut ctx.accounts.admin_account;
    // Now, we set the administrator to the signer of this instruction
    admin_configuration.admin_pubkey = admin_address;
    admin_configuration.is_active = true;
    admin_configuration.bump =  ctx.bumps.admin_account;

    Ok(())
}