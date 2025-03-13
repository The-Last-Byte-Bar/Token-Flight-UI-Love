import { AxiosResponse } from 'axios';

// Mock axios
const mockAxios = {
  create: jest.fn().mockReturnValue({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    }
  }),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
};

// Helper function to create a mock Axios response
export function createAxiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    headers: {},
    config: {},
  } as AxiosResponse<T>;
}

// Helper to configure axios mock to return specific data for a method and path
export function mockAxiosForPath(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  response: any,
  status = 200
) {
  const mockInstance = mockAxios.create();
  mockInstance[method].mockImplementation((url: string) => {
    if (url === path) {
      return Promise.resolve(createAxiosResponse(response, status));
    }
    return Promise.reject(new Error(`No mock defined for ${method} ${url}`));
  });
}

export default mockAxios; 