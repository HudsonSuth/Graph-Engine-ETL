# Will It Run? graph demo

Loads the public [Will It Run?](https://willitrunllm.com) catalog (models, hardware, fit verdicts, measured speeds) into StreamGraph Explore.

```powershell
npm run fixtures:willitrun   # optional: refresh explore/demos/willitrun/fixture.json (needs network)
npm run test:willitrun
npm run demo:willitrun
```

Then open the printed Explore URL (includes `?style=/explore/willitrun-style.json`). Click a GPU such as RTX 5060 to see which models fit (green), are tight (yellow), need RAM offload (orange), or do not fit (dim grey).

Default checker config cached in the fixture: min q4 (best quant at Q4 or better), ctx 4096, KV f16, 32 GB system RAM for discrete-GPU offload, 50 GB/s RAM bandwidth. Data from Will It Run?
