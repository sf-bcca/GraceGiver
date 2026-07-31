import React, { act } from 'react';

export { act };
export default {
  act,
  // Include dummy stubs for other deprecated test-utils if ever accessed
  IsComponent: () => false,
  IsDOMComponent: () => false,
  IsElement: () => false,
  Simulate: {},
};
