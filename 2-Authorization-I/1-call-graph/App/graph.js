/**
 * Returns a graph client object with the provided token acquisition options
 * @param {Object} account: user account object to be used when attempting silent token acquisition  
 * @param {Array} scopes: array of scopes required for this resource endpoint
 * @param {string} interactionType: type of interaction to fallback to when silent token acquisition fails 
 */
const getGraphClient = (providerOptions) => {

    /**
     * Pass the instance as authProvider in ClientOptions to instantiate the Client which will create and set the default middleware chain.
     * For more information, visit: https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/dev/docs/CreatingClientInstance.md
     */
    let clientOptions = {
        authProvider: new MsalAuthenticationProvider(providerOptions),
    };

    const graphClient = MicrosoftGraph.Client.initWithMiddleware(clientOptions);

    return graphClient;
}

/**
 * This class implements the IAuthenticationProvider interface, which allows a custom auth provider to be
 * used with the Graph client. See: https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/dev/src/IAuthenticationProvider.ts
 */
class MsalAuthenticationProvider {

    account;
    scopes;
    interactionType;

    constructor(providerOptions) {
        this.account = providerOptions.account;
        this.scopes = providerOptions.scopes;
        this.interactionType = providerOptions.interactionType;
    }

    /**
     * This method will get called before every request to the ms graph server
     * This should return a Promise that resolves to an accessToken (in case of success) or rejects with error (in case of failure)
     * Basically this method will contain the implementation for getting and refreshing accessTokens
     */
    getAccessToken() {
        return new Promise(async (resolve, reject) => {
            let response;

            try {
                response = await myMSALObj.acquireTokenSilent({
                    account: this.account,
                    scopes: this.scopes
                });

                if (response.accessToken) {
                    resolve(response.accessToken);
                } else {
                    reject(Error('Failed to acquire an access token'));
                }
            } catch (error) {
                // in case if silent token acquisition fails, fallback to an interactive method
                if (error instanceof msal.InteractionRequiredAuthError) {
                    switch (this.interactionType) {
                        case msal.InteractionType.Popup:

                            response = await myMSALObj.acquireTokenPopup({
                                scopes: this.scopes
                            });

                            if (response.accessToken) {
                                resolve(response.accessToken);
                            } else {
                                reject(Error('Failed to acquire an access token'));
                            }
                            break;

                        case msal.InteractionType.Redirect:
                            /**
                             * This will cause the app to leave the current page and redirect to the consent screen.
                             * Once consent is provided, the app will return back to the current page and then the 
                             * silent token acquisition will succeed. 
                             */
                            myMSALObj.acquireTokenRedirect({
                                scopes: this.scopes
                            });
                            break;

                        default:
                            break;
                    }
                }
            }
        });
    }
}
