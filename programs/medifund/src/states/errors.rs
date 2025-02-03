use anchor_lang::prelude::*;


#[error_code]
pub enum MedifundError{
    #[msg("Patient Case Has Not Been Verified")]
    NotVerifiedSuccessfully,

    #[msg("Only Callable By Administrator")]
    OnlyAdmin,

    #[msg("Only Caller With The Verifier Role Can Call This Function")]
    OnlyVerifier,
    #[msg("Provided Admin Account Is Invalid")]
    InvalidAdminAccount,

    #[msg("Verifier Address Already Exist In The Registry Of Verifiers")]
    VerifierAlreadyExists,

    #[msg("Verifier Address Not Found In Registry")]
    VerifierNotFound,

    #[msg("Specified Verifier Address Does Not Exists")]
    InvalidVerifierAddress,
}