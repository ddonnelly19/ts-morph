import { SyntaxKind, ts } from "@ts-morph/common";
import { ExportSpecifier, ImportSpecifier, Node, ShorthandPropertyAssignment } from "../../compiler";
import { CompilerFactory } from "../../factories";
import { StraightReplacementNodeHandler } from "./StraightReplacementNodeHandler";

/**
 * Replacement handler that handles renames
 */
export class RenameNodeHandler extends StraightReplacementNodeHandler {
  handleNode(currentNode: Node, newNode: ts.Node, newSourceFile: ts.SourceFile) {
    const currentNodeKind = currentNode.getKind();
    const newNodeKind = newNode.kind;

    if (currentNodeKind === SyntaxKind.ShorthandPropertyAssignment && newNodeKind === SyntaxKind.PropertyAssignment) {
      // move the identifier to the initializer. Ex. { a } -> { a: b } -- move a -> b
      const currentSourceFile = currentNode.getSourceFile();
      const currentIdentifier = (currentNode as ShorthandPropertyAssignment).getNameNode();
      const newIdentifier = (newNode as ts.PropertyAssignment).initializer;
      this.compilerFactory.replaceCompilerNode(currentIdentifier, newIdentifier);
      currentNode.forget();
      // ensure the parent is wrapped
      this.compilerFactory.getNodeFromCompilerNode(newNode, currentSourceFile);
      return;
    } else if (
      currentNodeKind === SyntaxKind.ExportSpecifier && newNodeKind === SyntaxKind.ExportSpecifier
      && (currentNode.compilerNode as ts.ExportSpecifier).propertyName == null && (newNode as ts.ExportSpecifier).propertyName != null
    ) {
      handleImportOrExportSpecifier(this.compilerFactory);
      return;
    } else if (
      currentNodeKind === SyntaxKind.ImportSpecifier && newNodeKind === SyntaxKind.ImportSpecifier
      && (currentNode.compilerNode as ts.ImportSpecifier).propertyName == null && (newNode as ts.ImportSpecifier).propertyName != null
    ) {
      handleImportOrExportSpecifier(this.compilerFactory);
      return;
    }

    super.handleNode(currentNode, newNode, newSourceFile);
    return;

    function handleImportOrExportSpecifier(compilerFactory: CompilerFactory) {
      function getNameText(node: ts.ModuleExportName) {
        return node.kind === SyntaxKind.Identifier ? node.escapedText : node.text;
      }

      // move the name to the property name. Ex. { a } -> { b as a } or { a } -> { a as b }
      const currentName = (currentNode as ImportSpecifier | ExportSpecifier).getNameNode();
      const newSpecifier = newNode as ts.ImportSpecifier | ts.ExportSpecifier;
      const newPropertyName = newSpecifier.propertyName!;
      const newName = newSpecifier.name;
      const newIdentifier = getNameText(newPropertyName) === getNameText(currentName.compilerNode) ? newName : newPropertyName;

      compilerFactory.replaceCompilerNode(currentName, newIdentifier);
      compilerFactory.replaceCompilerNode(currentNode, newNode);
    }
  }
}
