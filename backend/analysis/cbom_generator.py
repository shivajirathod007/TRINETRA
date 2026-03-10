from cyclonedx.model.bom import Bom, BomMetaData
from cyclonedx.model.component import Component, ComponentType
from cyclonedx.output.json import JsonV1Dot5
from typing import List, Dict

def generate_cbom(components_data: List[Dict]) -> str:
    """
    Generates a CycloneDX 1.5 Cryptographic Bill of Materials (CBOM).
    """
    bom = Bom()
    bom.metadata = BomMetaData()
    
    for item in components_data:
        comp = Component(
            type=ComponentType.CRYPTOGRAPHIC_ASSET,
            name=item.get("name", "Unknown Crypto Asset"),
            version=item.get("version", "1.0"),
            description=item.get("description", "Cryptographic component")
            # In a full impl, we'd map cryptoProperties here
        )
        bom.components.add(comp)
        
    outputter = JsonV1Dot5(bom)
    return outputter.output_as_string()
