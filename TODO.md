# Token Flight UI Backend TODO

## Phase 1: Project Setup and Environment Configuration
- [x] Initialize Node.js/TypeScript project
- [x] Configure ESLint and Prettier
- [x] Set up Jest for testing
- [x] Create Dockerfile for backend
- [x] Set up docker-compose for local development
- [x] Configure environment variables management
- [x] Create environment configurations for dev/prod
- [ ] Unit tests: Project configuration

## Phase 2: Wallet Integration with Fleet SDK
- [x] Implement Nautilus extension detection
- [x] Create connection manager for dApp-wallet communication
- [x] Add wallet address retrieval functionality
- [x] Implement connection status monitoring
- [x] Create token scanning service
- [x] Implement token categorization (Regular vs NFTs)
- [x] Add balance tracking functionality
- [x] Integrate Fleet SDK for transaction building
- [x] Create transaction builder service
- [ ] Implement input selection algorithm
- [x] Add change address management
- [x] Implement fee calculation
- [x] Create signing service for Nautilus
- [x] Implement transaction serialization/deserialization
- [x] Add transaction validation
- [x] Implement transaction broadcasting
- [ ] Unit tests: Wallet connection
- [ ] Unit tests: Token scanning
- [ ] Unit tests: Transaction building
- [ ] Unit tests: Transaction signing

## Phase 3: NFT Collection Identification
- [x] Create Ergo Platform API client
- [x] Implement box data retrieval for NFT tokens
- [ ] Add caching mechanism for API responses
- [x] Implement rate limiting and error handling
- [x] Implement register decoder for R4-R9 registers
- [x] Create metadata parser for different NFT standards
- [x] Implement collection information extractor
- [x] Add image URL and media extraction
- [x] Implement collection grouping algorithm
- [x] Create standalone NFT handler
- [x] Add partial collection detection
- [x] Implement collection metadata aggregation
- [ ] Create collection thumbnail selection logic
- [ ] Create collection data storage service
- [ ] Implement collection update mechanisms
- [x] Add collection selection interface for airdrops
- [x] Unit tests: API client
- [x] Unit tests: Metadata extraction
- [x] Unit tests: Collection identification
- [ ] Unit tests: Collection management

## Phase 4: External API Integration
- [x] Create generic API client with authentication
- [ ] Implement request caching
- [x] Add retry logic and error handling
- [x] Implement Sigmanauts mining pool API client
- [x] Create address extraction service
- [x] Add data validation and normalization
- [x] Implement pagination for large datasets
- [ ] Create recipient address storage service
- [ ] Implement address validation
- [x] Add duplicate address detection
- [x] Create address grouping mechanisms
- [ ] Unit tests: API client framework
- [ ] Unit tests: Mining pool integration
- [ ] Unit tests: Address management

## Phase 5: Airdrop Configuration and Execution
- [x] Implement distribution method definition
- [x] Create validation rules for different distribution types
- [ ] Add configuration storage service
- [x] Implement required field validation
- [x] Create airdrop execution service
- [x] Implement batch transaction processing
- [ ] Add progress tracking
- [ ] Create transaction history storage
- [ ] Implement distribution simulation
- [ ] Create preview generation
- [x] Add fee calculation for entire airdrop
- [x] Implement pre-execution validation checks
- [x] Create airdrop API endpoints
- [ ] Unit tests: Distribution configuration
- [ ] Unit tests: Airdrop processing
- [ ] Unit tests: Preview generation

## Phase 6: Testing, Documentation and Deployment
- [ ] Implement comprehensive unit tests
- [ ] Create integration tests for API interactions
- [ ] Add end-to-end tests for complete flows
- [ ] Implement test data generation
- [ ] Create OpenAPI/Swagger documentation
- [x] Implement endpoint documentation
- [ ] Add example requests and responses
- [x] Finalize Docker configuration
- [x] Create deployment scripts
- [x] Implement health checks and monitoring
- [x] Add logging and error tracking

## Phase 7: Frontend Integration
- [x] Implement REST API endpoints for frontend
- [ ] Create WebSocket endpoints for real-time updates
- [ ] Add authentication and security measures
- [x] Implement CORS configuration
- [ ] Create data transformation layer
- [x] Implement pagination for large datasets
- [ ] Add filtering and sorting capabilities
- [ ] Create search functionality
- [ ] Unit tests: API endpoints
- [ ] Unit tests: Data transformation 