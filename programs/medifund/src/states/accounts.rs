use anchor_lang::prelude::*;

use crate::states::errors::*;


// CREATE THE ADMINISTRATOR ACCOUNT HERE
#[account]
pub struct Administrator {
    pub admin_pubkey: Pubkey,

    pub is_active: bool,

    pub bump: u8,
}





// CREATE THE VERIFIER INFO CONFIG HERE
#[account]
pub struct Verifier{
    pub verifier_key: Pubkey,
    pub is_verifier: bool,
    pub verifier_bump: u8,
}


// CREATE A VERIFIER REGISTRY LIST TO STORE ALL VERIFIERS' PDA accounts here
#[account]
pub struct VerfiersList {
    pub all_verifiers: Vec<Pubkey>,
    pub verifier_registry_bump: u8,
}

impl VerfiersList {
    // Function to Add verifier Onto The Verifiers List
    pub fn add_verifierPDA_to_list(&mut self, verifier_to_add: Pubkey) -> Result<()> {
        require!(!self.all_verifiers.contains(&verifier_to_add), MedifundError::VerifierAlreadyExists);

        self.all_verifiers.push(verifier_to_add);
        Ok(())
    }

    // Function to Remove Verifier From The Verifiers List
    pub fn remove_verifierPDA_from_list(&mut self, verifier_to_remove: &Pubkey) -> Result<()> {
        //require!(self.all_verifiers.contains(&verifier_to_remove), MedifundError::VerifierNotFound);

        if let Some(index) = self.all_verifiers.iter().position(|x| x == verifier_to_remove) {
            self.all_verifiers.remove(index);
            Ok(())
        } else {
            err!(MedifundError::VerifierNotFound)
        }
    }
}

// CREATE THE VERIFY PATIENT ACCOUNT HERE
#[account]
pub struct VerifyPatientCase {}


// CREATE THE ESCROW PDA ACCOUNT