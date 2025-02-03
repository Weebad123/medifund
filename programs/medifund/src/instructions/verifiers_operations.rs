use anchor_lang::prelude::*;

use crate::states::{contexts::*, errors::*};


/* There Is Gonna Be A Verifier Registry List
Where I Track All Added Verifiers To The System. 
This Will Be A PDA initialized One Time */

// Let's Initialize The Verifiers Registry PDA account here
pub fn initialize_verifiers_list(ctx: Context<InitializeVerifiersRegistry>) -> Result<()> {
    let verifiers_registry = &mut ctx.accounts.verifiers_registry_list;


    verifiers_registry.all_verifiers = Vec::new();
    verifiers_registry.verifier_registry_bump = ctx.bumps.verifiers_registry_list;
    Ok(())
}


pub fn add_verifier(ctx: Context<VerifierInfo>, verifier_address: Pubkey) -> Result<()> {
    // Let's get the context struct
    let verifier_info = &mut ctx.accounts.verifier;

    // Let's set the verifier status
    verifier_info.verifier_key = verifier_address;
    verifier_info.is_verifier = true;
    verifier_info.verifier_bump = ctx.bumps.verifier;

    // Let's Add This Verifier Address To The Global Verifiers Registry
    let verifiers_registry = &mut ctx.accounts.verifiers_list;

    // Add the verifier PDA account, and not just the address
    verifiers_registry.add_verifierPDA_to_list(verifier_info.key())?;

    Ok(())
}

pub fn remove_verifier(ctx: Context<VerifierInfo>, verifier_address: Pubkey) -> Result<()> {

    let verifier_info = &mut ctx.accounts.verifier;

    // Let's ensure the intended verifier to remove is the one we really want to remove
    require!(verifier_info.verifier_key == verifier_address, MedifundError::InvalidVerifierAddress);

    // Remove Verifier PDA from the Global Registry
    let verifiers_registry = &mut ctx.accounts.verifiers_list;

    verifiers_registry.remove_verifierPDA_from_list(&verifier_info.key())?;

    // Let's set verifier status to false
    verifier_info.is_verifier = false;

    Ok(())
}


#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub enum VerifierOperationType {
    Add,
    Remove,
}